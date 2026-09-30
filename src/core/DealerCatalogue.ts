// Models
import { Category } from '../models/category';
import { Attribute } from '../models/attribute';
import { AttributeValue } from '../models/attribute-value';

// Helpers
import { empty, getStr } from '../utils';

//--------------------------------------------------------------
/*
    What a dealer is allowed to see in the catalogue, and how stock is reported to them.
    Shared by the catalogue, cart and checkout so the three can never disagree.
*/

export const DEALER_VISIBILITIES = ['PUBLIC', 'CATALOGUE_ONLY'];

export interface IStockStatus {
    inStock: boolean;
    availableQuantity: number | null; // null = stock not tracked
    lowStock: boolean;
}

export interface IAttributeLookup {
    attributes: Map<string, any>;
    values: Map<string, any>;
}

export default class DealerCatalogue {

    static async hiddenCategoryIds(): Promise<any[]> {
        const rows = await Category.find({ $or: [{ deletedAt: { $ne: null } }, { status: { $ne: 'ACTIVE' } }] }).select('_id').lean();
        return rows.map((row: any) => row._id);
    }

    // base filter for every dealer-facing product query; `conditions` are ANDed on top
    static async visibleProductQuery(conditions: any[] = []): Promise<any> {
        const and: any[] = [
            { deletedAt: null, status: 'ACTIVE', visibility: { $in: DEALER_VISIBILITIES } },
            ...conditions,
        ];

        const hidden = await this.hiddenCategoryIds();
        if (hidden.length) and.push({ categoryId: { $nin: hidden } }, { subcategoryId: { $nin: hidden } }, { childCategoryId: { $nin: hidden } });

        return { $and: and };
    }

    static activeVariations(product: any): any[] {
        return (product?.variations || []).filter((v: any) => v.status === 'ACTIVE');
    }

    static isVariable(product: any): boolean {
        return product?.productType === 'VARIABLE';
    }

    static stock(product: any, variation?: any): IStockStatus {
        const inventory = product?.inventory || {};
        if (inventory.inventoryTracking === false) return { inStock: true, availableQuantity: null, lowStock: false };

        if (variation) {
            const available = Math.max(0, (Number(variation.stockQuantity) || 0) - (Number(variation.reservedQuantity) || 0));
            const threshold = Number(variation.lowStockThreshold) || Number(inventory.lowStockThreshold) || 0;
            return { inStock: available > 0 || !!variation.backorderAllowed, availableQuantity: available, lowStock: available > 0 && available <= threshold };
        }

        if (this.isVariable(product)) {
            const statuses = this.activeVariations(product).map((v: any) => this.stock(product, v));
            const available = statuses.reduce((sum, s) => sum + (s.availableQuantity || 0), 0);
            return { inStock: statuses.some((s) => s.inStock), availableQuantity: available, lowStock: statuses.some((s) => s.lowStock) };
        }

        const available = Math.max(0, Number(inventory.globalStock) || 0);
        const threshold = Number(inventory.lowStockThreshold) || 0;
        return { inStock: available > 0 || !!inventory.allowBackorders, availableQuantity: available, lowStock: available > 0 && available <= threshold };
    }

    // one query per collection for every attribute / value referenced by these products
    static async attributeLookup(products: any[]): Promise<IAttributeLookup> {
        const attributeIds = new Set<string>();
        const valueIds = new Set<string>();

        products.forEach((product: any) => {
            (product.attributes || []).forEach((a: any) => { if (a.attributeId) attributeIds.add(getStr(a.attributeId)); if (a.attributeValueId) valueIds.add(getStr(a.attributeValueId)); });
            (product.variationAttributes || []).forEach((va: any) => { if (va.attributeId) attributeIds.add(getStr(va.attributeId)); (va.valueIds || []).forEach((id: any) => valueIds.add(getStr(id))); });
            (product.variations || []).forEach((v: any) => (v.attributeValues || []).forEach((av: any) => { if (av.attributeId) attributeIds.add(getStr(av.attributeId)); if (av.attributeValueId) valueIds.add(getStr(av.attributeValueId)); }));
        });

        const [attributes, values] = await Promise.all([
            attributeIds.size ? Attribute.find({ _id: { $in: [...attributeIds] }, deletedAt: null }).lean() : [],
            valueIds.size ? AttributeValue.find({ _id: { $in: [...valueIds] }, deletedAt: null }).lean() : [],
        ]);

        return {
            attributes: new Map(attributes.map((a: any) => [getStr(a._id), a])),
            values: new Map(values.map((v: any) => [getStr(v._id), v])),
        };
    }

    // human-readable value of a product attribute row (select / text / numeric / custom)
    static attributeDisplayValue(row: any, lookup: IAttributeLookup): string {
        const value = row.attributeValueId ? lookup.values.get(getStr(row.attributeValueId)) : null;
        if (value) return getStr(value.displayValue) || getStr(value.value);
        if (!empty(row.customValue)) return getStr(row.customValue);
        if (!empty(row.textValue)) return getStr(row.textValue);
        if (!empty(row.numericValue)) return `${row.numericValue}${row.unit ? ` ${row.unit}` : ''}`;
        return '';
    }

}
