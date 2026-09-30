// Models
import { Product } from '../models/product';

// Helpers
import { empty, getStr } from '../utils';
import DealerCatalogue, { IStockStatus } from './DealerCatalogue';
import DealerPricing from './DealerPricing';

//--------------------------------------------------------------
/*
    Prices a cart for one dealer from live data. The cart screen and checkout both go through
    price(), so what the dealer reviews is exactly what the PO is created from.

    GST per line: rate = tax.rate when tax.gstApplicable, else 0.
      - exclusive price: GST is added on top
      - inclusive price: GST is backed out of the price, the line total stays what the dealer saw
    `unitPrice` is what the dealer pays per unit before GST is added (the "₹1,250 / unit" figure);
    `taxableUnitPrice` is the pre-GST unit value recorded on the PO.
*/

export const CART_LIMITS = {
    MAX_LINES: 100,
    MAX_QUANTITY: 100000,
};

export type CartIssueCode = 'UNAVAILABLE' | 'NO_PRICE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface ICartIssue {
    code: CartIssueCode;
    availableQuantity: number | null;
}

export interface IPricedCartLine {
    itemId: string;
    productId: string;
    variationId: string | null;
    product: any | null;
    variation: any | null;
    name: string;
    sku: string;
    variantLabel: string | null;
    quantity: number;
    unitPrice: number | null;
    taxableUnitPrice: number | null;
    mrp: number | null;
    taxRate: number;
    taxInclusive: boolean;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
    stock: IStockStatus | null;
    issue: ICartIssue | null;
}

export interface IPricedCart {
    lines: IPricedCartLine[];
    summary: {
        itemCount: number;
        totalQuantity: number;
        subtotal: number;
        tax: number;
        taxRate: number | null; // single rate when every line shares it ("GST @ 18%"), else null
        taxBreakdown: { rate: number, amount: number }[];
        shipping: number;
        total: number;
        currency: string;
    };
    canCheckout: boolean;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export default class DealerCart {

    static findVariation(product: any, variationId: any): any | null {
        if (empty(variationId)) return null;
        return DealerCatalogue.activeVariations(product).find((v: any) => getStr(v._id) === getStr(variationId)) || null;
    }

    // "Antique Gold | 6 inch" - variation values in the product's attribute order
    static variantLabel(product: any, variation: any, lookup: any): string | null {
        if (!variation) return null;
        const order = (product.variationAttributes || []).map((va: any) => getStr(va.attributeId));
        const parts = [...(variation.attributeValues || [])]
            .sort((a: any, b: any) => order.indexOf(getStr(a.attributeId)) - order.indexOf(getStr(b.attributeId)))
            .map((av: any) => { const v = lookup.values.get(getStr(av.attributeValueId)); return getStr(v?.displayValue) || getStr(v?.value); })
            .filter(Boolean);
        return parts.length ? parts.join(' | ') : getStr(variation.sku) || null;
    }

    // Throws nothing: problems are reported per line so the app can show them inline.
    static stockIssue(stock: IStockStatus, product: any, variation: any, quantity: number): ICartIssue | null {
        const backorder = variation ? !!variation.backorderAllowed : !!product?.inventory?.allowBackorders;
        if (stock.availableQuantity === null || backorder) return null;
        if (stock.availableQuantity <= 0) return { code: 'OUT_OF_STOCK', availableQuantity: 0 };
        if (quantity > stock.availableQuantity) return { code: 'INSUFFICIENT_STOCK', availableQuantity: stock.availableQuantity };
        return null;
    }

    static async price(dealer: any, cart: any): Promise<IPricedCart> {
        const items: any[] = cart?.items || [];
        const productIds = [...new Set(items.map((i: any) => getStr(i.productId)))];

        const products = productIds.length
            ? await Product.find(await DealerCatalogue.visibleProductQuery([{ _id: { $in: productIds } }])).lean()
            : [];
        const productById = new Map<string, any>(products.map((p: any) => [getStr(p._id), p]));

        // products no longer visible still need a name/image so the app can say what became unavailable
        const hiddenIds = productIds.filter((id) => !productById.has(id));
        const hidden = hiddenIds.length ? await Product.find({ _id: { $in: hiddenIds } }).select('name baseSku productCode images').lean() : [];
        const hiddenById = new Map<string, any>(hidden.map((p: any) => [getStr(p._id), p]));

        const [ctx, lookup] = await Promise.all([
            DealerPricing.buildContext(dealer, products.map((p: any) => p._id)),
            DealerCatalogue.attributeLookup(products),
        ]);

        let currency = 'INR';
        const lines: IPricedCartLine[] = items.map((item: any) => {
            const product = productById.get(getStr(item.productId)) || null;
            const isVariable = product ? DealerCatalogue.isVariable(product) : false;
            const variation = product && isVariable ? this.findVariation(product, item.variationId) : null;
            const quantity = Number(item.quantity) || 0;

            const base: IPricedCartLine = {
                itemId: getStr(item._id),
                productId: getStr(item.productId),
                variationId: getStr(item.variationId) || null,
                product,
                variation,
                name: getStr(product?.name),
                sku: getStr(variation?.sku) || getStr(product?.baseSku) || getStr(product?.productCode),
                variantLabel: product ? this.variantLabel(product, variation, lookup) : null,
                quantity,
                unitPrice: null,
                taxableUnitPrice: null,
                mrp: null,
                taxRate: 0,
                taxInclusive: false,
                lineSubtotal: 0,
                lineTax: 0,
                lineTotal: 0,
                stock: null,
                issue: null,
            };

            // product hidden/removed, or a variable product whose variant is gone
            if (!product) {
                const snapshot = hiddenById.get(getStr(item.productId));
                return {
                    ...base,
                    product: snapshot || null, // image only - never priced
                    name: getStr(snapshot?.name),
                    sku: getStr(snapshot?.baseSku) || getStr(snapshot?.productCode),
                    issue: { code: 'UNAVAILABLE', availableQuantity: null },
                };
            }
            if ((isVariable && !variation) || (!isVariable && !empty(item.variationId))) {
                return { ...base, issue: { code: 'UNAVAILABLE', availableQuantity: null } };
            }

            const resolved = DealerPricing.resolve(ctx, product, variation || undefined);
            const stock = DealerCatalogue.stock(product, variation || undefined);
            currency = resolved.currency;

            if (resolved.dealerPrice === null) return { ...base, stock, issue: { code: 'NO_PRICE', availableQuantity: null } };

            const taxRate = product.tax?.gstApplicable ? Math.max(0, Number(product.tax?.rate) || 0) : 0;
            const taxInclusive = product.tax?.inclusive !== false;
            const unitPrice = resolved.dealerPrice;

            let taxableUnitPrice: number, lineSubtotal: number, lineTax: number;
            if (taxInclusive) {
                taxableUnitPrice = round2(unitPrice / (1 + taxRate / 100));
                lineSubtotal = round2(taxableUnitPrice * quantity);
                lineTax = round2(unitPrice * quantity - lineSubtotal); // keeps the line total equal to price x qty
            } else {
                taxableUnitPrice = unitPrice;
                lineSubtotal = round2(unitPrice * quantity);
                lineTax = round2(lineSubtotal * taxRate / 100);
            }

            return {
                ...base,
                unitPrice,
                taxableUnitPrice,
                mrp: resolved.mrp,
                taxRate,
                taxInclusive,
                lineSubtotal,
                lineTax,
                lineTotal: round2(lineSubtotal + lineTax),
                stock,
                issue: this.stockIssue(stock, product, variation, quantity),
            };
        });

        const valid = lines.filter((l) => !l.issue);
        const byRate = new Map<number, number>();
        valid.forEach((l) => byRate.set(l.taxRate, round2((byRate.get(l.taxRate) || 0) + l.lineTax)));

        const subtotal = round2(valid.reduce((sum, l) => sum + l.lineSubtotal, 0));
        const tax = round2(valid.reduce((sum, l) => sum + l.lineTax, 0));
        const shipping = 0; // "Shipping & Insurance: Free" in the dealer app

        return {
            lines,
            summary: {
                itemCount: valid.length,
                totalQuantity: valid.reduce((sum, l) => sum + l.quantity, 0),
                subtotal,
                tax,
                taxRate: byRate.size === 1 ? [...byRate.keys()][0] : null,
                taxBreakdown: [...byRate.entries()].filter(([rate]) => rate > 0).map(([rate, amount]) => ({ rate, amount })),
                shipping,
                total: round2(subtotal + tax + shipping),
                currency,
            },
            canCheckout: lines.length > 0 && lines.every((l) => !l.issue),
        };
    }

}
