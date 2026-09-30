// Models
import { Product } from '../models/product';
import { Dealer } from '../models/dealer';
import { PurchaseOrder } from '../models/purchase-order';

// Helpers
import { getStr, logError } from '../utils';
import DealerCatalogue from './DealerCatalogue';
import DealerPricing from './DealerPricing';
import DealerNotification, { DEALER_NOTIFICATION_TYPE, IDealerNotificationPayload } from './DealerNotification';

//--------------------------------------------------------------
/*
    Turns admin-side product changes into dealer notifications, whatever the entry point
    (product form, status toggle, bulk stock/price upload, import, bulk price adjustment,
    PO approval/delivery moving stock):

        capture(ids) -> change the products -> dispatch(snapshot)     or simply   track(ids, change)

    Compared per product, dealer-visible products only:
      - NEW_ARRIVAL  it became visible to dealers (published), or was flagged "New Product"
      - PRICE_UPDATED  the dealer's own resolved price moved (dealers on a fixed price are skipped)
      - LOW_STOCK    available stock dropped to / below its threshold; sent to dealers who have ordered it

    Delivery runs after the admin response (setImmediate) and never throws into the caller.
    Large bulk edits collapse into one summary per dealer instead of a notification per product.
*/

const PER_PRODUCT_LIMIT = 3; // more changes than this in one operation -> one summary notification

export interface IProductSnapshot {
    ids: string[];
    before: Map<string, any>; // productId -> product (visible ones only)
}

interface IChange {
    before: any | null;
    after: any;
}

const money = (value: number | null): string => value === null ? '-' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const dealerPrice = (ctx: any, product: any): number | null => {
    const resolved = DealerCatalogue.isVariable(product)
        ? DealerPricing.resolveLowest(ctx, product, DealerCatalogue.activeVariations(product))
        : DealerPricing.resolve(ctx, product);
    return resolved.dealerPrice;
}

export default class ProductWatch {

    static async #visible(ids: string[]): Promise<Map<string, any>> {
        if (!ids.length) return new Map();
        const products = await Product.find(await DealerCatalogue.visibleProductQuery([{ _id: { $in: ids } }])).lean();
        return new Map(products.map((p: any) => [getStr(p._id), p]));
    }

    static async capture(ids: any[] = []): Promise<IProductSnapshot> {
        const unique = [...new Set(ids.map(getStr).filter(Boolean))];
        return { ids: unique, before: await this.#visible(unique) };
    }

    // `extraIds`: products that didn't exist at capture time (created by the operation)
    static dispatch(snapshot: IProductSnapshot, extraIds: any[] = []): void {
        setImmediate(() => {
            this.#process(snapshot, extraIds).catch((e: any) => logError(e, '[PRODUCT-WATCH] -'));
        });
    }

    static async track<T>(ids: any[], change: () => Promise<T>): Promise<T> {
        const snapshot = await this.capture(ids);
        const result = await change();
        this.dispatch(snapshot);
        return result;
    }

    static async #process(snapshot: IProductSnapshot, extraIds: any[]): Promise<void> {
        const ids = [...new Set([...snapshot.ids, ...extraIds.map(getStr)].filter(Boolean))];
        const after = await this.#visible(ids);
        if (!after.size) return;

        const newArrivals: any[] = [];
        const priceChanges: IChange[] = [];
        const lowStock: any[] = [];

        after.forEach((product, id) => {
            const before = snapshot.before.get(id) || null;
            if (!before || (!before.isNewArrival && product.isNewArrival)) { newArrivals.push(product); return; }

            if (JSON.stringify(this.#priceKey(before)) !== JSON.stringify(this.#priceKey(product))) priceChanges.push({ before, after: product });

            const wasLow = DealerCatalogue.stock(before);
            const isLow = DealerCatalogue.stock(product);
            if (!(wasLow.lowStock || !wasLow.inStock) && isLow.lowStock) lowStock.push(product);
        });

        if (!newArrivals.length && !priceChanges.length && !lowStock.length) return;

        const dealers = await Dealer.find({ deletedAt: null, status: 'ACTIVE', approvalStatus: 'APPROVED' }).select('_id defaultDiscount').lean();
        if (!dealers.length) return;

        const outbox: { dealerId: any, payload: IDealerNotificationPayload }[] = [];
        dealers.forEach((d: any) => this.#newArrivalNotices(newArrivals).forEach((payload) => outbox.push({ dealerId: d._id, payload })));
        outbox.push(...await this.#priceNotices(dealers, priceChanges));
        outbox.push(...await this.#lowStockNotices(dealers, lowStock));

        await DealerNotification.notifyMany(outbox);
    }

    // every price input a dealer price is derived from
    static #priceKey(product: any): any {
        const { price, salePrice, priceStartDate, priceEndDate } = product.pricing || {};
        return {
            p: [price, salePrice, priceStartDate, priceEndDate],
            v: DealerCatalogue.activeVariations(product).map((v: any) => [getStr(v._id), v.priceMode, v.price, v.salePrice]),
        };
    }

    static #newArrivalNotices(products: any[]): IDealerNotificationPayload[] {
        if (!products.length) return [];
        if (products.length > PER_PRODUCT_LIMIT) {
            return [{
                type: DEALER_NOTIFICATION_TYPE.NEW_ARRIVAL,
                title: 'New Arrivals',
                description: `${products.length} new products are now available in the Catalogue`,
                navigateTo: 'NEW_ARRIVALS',
                data: { productIds: products.map((p) => getStr(p._id)) },
            }];
        }
        return products.map((p) => ({
            type: DEALER_NOTIFICATION_TYPE.NEW_ARRIVAL,
            title: 'New Arrival',
            description: `${getStr(p.name)} is now available in the Catalogue`,
            navigateTo: 'PRODUCT_DETAILS',
            data: { productId: getStr(p._id) },
        }));
    }

    // priced per dealer: only dealers whose own price actually moved are told
    static async #priceNotices(dealers: any[], changes: IChange[]): Promise<{ dealerId: any, payload: IDealerNotificationPayload }[]> {
        if (!changes.length) return [];
        const out: { dealerId: any, payload: IDealerNotificationPayload }[] = [];
        const productIds = changes.map((c) => c.after._id);

        for (const dealer of dealers) {
            const ctx = await DealerPricing.buildContext(dealer, productIds);
            const moved = changes
                .map((c) => ({ product: c.after, was: dealerPrice(ctx, c.before), now: dealerPrice(ctx, c.after) }))
                .filter((m) => m.now !== null && m.was !== m.now);
            if (!moved.length) continue;

            if (moved.length > PER_PRODUCT_LIMIT) {
                out.push({ dealerId: dealer._id, payload: {
                    type: DEALER_NOTIFICATION_TYPE.PRICE_UPDATED,
                    title: 'Prices Updated',
                    description: `Prices changed for ${moved.length} products in the Catalogue`,
                    navigateTo: 'CATALOGUE',
                    data: { productIds: moved.map((m) => getStr(m.product._id)) },
                } });
                continue;
            }
            moved.forEach((m) => out.push({ dealerId: dealer._id, payload: {
                type: DEALER_NOTIFICATION_TYPE.PRICE_UPDATED,
                title: 'Price Updated',
                description: `${getStr(m.product.name)} now ${money(m.now)} (was ${money(m.was)})`,
                navigateTo: 'PRODUCT_DETAILS',
                data: { productId: getStr(m.product._id), oldPrice: m.was, newPrice: m.now },
            } }));
        }
        return out;
    }

    // only dealers who have bought the product before - a low-stock alert is noise to everyone else
    static async #lowStockNotices(dealers: any[], products: any[]): Promise<{ dealerId: any, payload: IDealerNotificationPayload }[]> {
        if (!products.length) return [];
        const activeIds = new Set(dealers.map((d: any) => getStr(d._id)));
        const perDealer = new Map<string, any[]>();

        for (const product of products) {
            const buyers = await PurchaseOrder.distinct('dealerId', { 'items.productId': product._id, deletedAt: null });
            buyers.map(getStr).filter((id: string) => activeIds.has(id)).forEach((id: string) => perDealer.set(id, [...(perDealer.get(id) || []), product]));
        }

        const out: { dealerId: any, payload: IDealerNotificationPayload }[] = [];
        perDealer.forEach((list, dealerId) => {
            if (list.length > PER_PRODUCT_LIMIT) {
                out.push({ dealerId, payload: {
                    type: DEALER_NOTIFICATION_TYPE.LOW_STOCK,
                    title: 'Low Stock Alert',
                    description: `${list.length} products you have ordered are running low`,
                    navigateTo: 'CATALOGUE',
                    data: { productIds: list.map((p) => getStr(p._id)) },
                } });
                return;
            }
            list.forEach((p) => {
                const available = DealerCatalogue.stock(p).availableQuantity;
                out.push({ dealerId, payload: {
                    type: DEALER_NOTIFICATION_TYPE.LOW_STOCK,
                    title: 'Low Stock Alert',
                    description: `${getStr(p.name)} - only ${available} left in stock`,
                    navigateTo: 'PRODUCT_DETAILS',
                    data: { productId: getStr(p._id), availableQuantity: available },
                } });
            });
        });
        return out;
    }

}
