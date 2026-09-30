// Models
import { DealerPricing as DealerPricingModel } from '../models/dealer-pricing';
import { DealerDiscount } from '../models/dealer-discount';

// Helpers
import { empty, getStr } from '../utils';

//--------------------------------------------------------------
/*
    Resolves what a specific dealer pays for a product / variation. Priority, highest first:

        1. DealerPricing   - fixed price for this dealer + product (applies to every variation)
        2. DealerDiscount  - % off for this dealer on the product's most specific category
                             (child category > subcategory > root category)
        3. Dealer.defaultDiscount - % off everything
        4. Base price      - no dealer-specific terms

    Discounts apply to the base selling price: the sale price while its date window is open,
    otherwise the list price. The list price is what the app shows as MRP.

    Usage: build one context per request for all products on screen (one query per rule type),
    then resolve() in memory - never query per product.
*/

export type DealerPriceSource = 'DEALER_PRICE' | 'CATEGORY_DISCOUNT' | 'DEFAULT_DISCOUNT' | 'BASE';

export interface IDealerPrice {
    currency: string;
    mrp: number | null;
    dealerPrice: number | null;
    discountPercent: number; // saving vs MRP, for the strike-through badge
    source: DealerPriceSource;
}

export interface IDealerPricingContext {
    defaultDiscount: number;
    fixedPriceByProduct: Map<string, number>;
    discountByCategory: Map<string, number>;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

// status ACTIVE and inside the optional effectiveFrom / effectiveTo window
const activeWindowQuery = (now: Date): any => ({
    status: 'ACTIVE',
    $and: [
        { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: now } }] },
        { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }] },
    ],
});

const isPositive = (value: any): boolean => !empty(value) && Number(value) > 0;

export default class DealerPricing {

    static async buildContext(dealer: any, productIds: any[] = []): Promise<IDealerPricingContext> {
        const now = new Date();
        const fixedPriceByProduct = new Map<string, number>();
        const discountByCategory = new Map<string, number>();

        // newest rule wins when admins leave overlapping rows active
        const [fixedRows, discountRows] = await Promise.all([
            productIds.length
                ? DealerPricingModel.find({ dealerId: dealer._id, productId: { $in: productIds }, ...activeWindowQuery(now) }).sort({ createdAt: 1 }).lean()
                : [],
            DealerDiscount.find({ dealerId: dealer._id, ...activeWindowQuery(now) }).sort({ createdAt: 1 }).lean(),
        ]);

        fixedRows.forEach((row: any) => { if (!empty(row.price) && Number(row.price) >= 0) fixedPriceByProduct.set(getStr(row.productId), Number(row.price)); });
        discountRows.forEach((row: any) => discountByCategory.set(getStr(row.categoryId), Number(row.discountPercent) || 0));

        return { defaultDiscount: Number(dealer.defaultDiscount) || 0, fixedPriceByProduct, discountByCategory };
    }

    // list price and current selling price for a product or one of its variations
    static basePrices(product: any, variation?: any): { mrp: number | null, base: number | null } {
        const now = Date.now();
        const pricing = product?.pricing || {};
        const saleWindowOpen = (empty(pricing.priceStartDate) || new Date(pricing.priceStartDate).getTime() <= now)
            && (empty(pricing.priceEndDate) || new Date(pricing.priceEndDate).getTime() >= now);

        const source = variation && variation.priceMode === 'OVERRIDE' ? variation : pricing;
        const mrp = isPositive(source.price) ? Number(source.price) : null;
        // a "sale" price at or above the list price (e.g. left behind after the list price was cut) is ignored
        const sale = saleWindowOpen && isPositive(source.salePrice) && (mrp === null || Number(source.salePrice) < mrp) ? Number(source.salePrice) : null;

        return { mrp, base: sale ?? mrp };
    }

    static resolve(ctx: IDealerPricingContext, product: any, variation?: any): IDealerPrice {
        const currency = getStr(product?.pricing?.currency) || 'INR';
        const { mrp, base } = this.basePrices(product, variation);

        let dealerPrice: number | null = base;
        let source: DealerPriceSource = 'BASE';

        const fixed = ctx.fixedPriceByProduct.get(getStr(product._id));
        if (fixed !== undefined) {
            dealerPrice = fixed;
            source = 'DEALER_PRICE';
        } else if (base !== null) {
            const categoryDiscount = [product.childCategoryId, product.subcategoryId, product.categoryId]
                .map((id: any) => ctx.discountByCategory.get(getStr(id)))
                .find((percent: number | undefined) => percent !== undefined);

            const percent = categoryDiscount ?? ctx.defaultDiscount;
            if (percent > 0) {
                dealerPrice = base * (1 - Math.min(percent, 100) / 100);
                source = categoryDiscount !== undefined ? 'CATEGORY_DISCOUNT' : 'DEFAULT_DISCOUNT';
            }
        }

        dealerPrice = dealerPrice === null ? null : round2(dealerPrice);
        const discountPercent = mrp && dealerPrice !== null && dealerPrice < mrp ? round2((1 - dealerPrice / mrp) * 100) : 0;

        return { currency, mrp, dealerPrice, discountPercent, source };
    }

    // cheapest sellable option - the "from" price on a variable product's card
    static resolveLowest(ctx: IDealerPricingContext, product: any, variations: any[]): IDealerPrice {
        const priced = variations.map((v: any) => this.resolve(ctx, product, v)).filter((p) => p.dealerPrice !== null);
        if (!priced.length) return this.resolve(ctx, product);
        return priced.reduce((min, p) => (p.dealerPrice as number) < (min.dealerPrice as number) ? p : min);
    }

}
