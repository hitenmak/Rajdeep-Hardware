// Models
import { Category } from '../models/category';
import { Attribute as AttributeModel } from '../models/attribute';
import { AttributeValue } from '../models/attribute-value';
import { AttributeSet } from '../models/attribute-set';

// Helpers
import { empty, getStr } from '../utils';

//--------------------------------------------------------------
/*
    Resolves the final attribute schema (and allowed values) a product should show,
    following: Category Attribute Set -> Subcategory Rule (Inherit/Add/Override).
    See product_module_specification "6.5 Attribute Resolution Logic".
*/

export interface IResolvedAttribute {
    attributeId: string;
    name: string;
    code: string;
    inputType: string;
    unit: string;
    isRequired: boolean;
    isVariationAttribute: boolean;
    allowedValues: { id: string; value: string; code: string; hexCode: string; image: string; sortOrder: number }[];
}

export default class AttributeCore {

    // expand one Attribute Set into resolved attribute rows (with allowed values) {
    static async expandSet(attributeSetId: any): Promise<IResolvedAttribute[]> {
        if (empty(attributeSetId)) return [];

        const set: any = await AttributeSet.findOne({ _id: attributeSetId, deletedAt: null }).lean();
        if (empty(set) || empty(set.items)) return [];

        const attributeIds = (set.items || []).map((item: any) => item.attributeId);
        const attributesById: any = {};
        const attributes = await AttributeModel.find({ _id: { $in: attributeIds }, deletedAt: null }).lean();
        attributes.forEach((a: any) => attributesById[a._id.toString()] = a);

        const resolved: IResolvedAttribute[] = [];
        for (const item of (set.items || [])) {
            const attribute = attributesById[getStr(item.attributeId)];
            if (empty(attribute) || attribute.status !== 'ACTIVE') continue;

            resolved.push({
                attributeId: getStr(attribute._id),
                name: getStr(attribute.name),
                code: getStr(attribute.code),
                inputType: getStr(attribute.inputType),
                unit: getStr(attribute.unit),
                isRequired: !!item.isRequired,
                isVariationAttribute: !!item.isVariationAttribute,
                allowedValues: await this.resolveAllowedValues(attribute._id, item.allowedValueIds),
            });
        }

        return resolved;
    }
    // } expand one Attribute Set into resolved attribute rows (with allowed values)

    // resolve the list of values allowed for one attribute (restricted or all active) {
    static async resolveAllowedValues(attributeId: any, allowedValueIds: any[] = []): Promise<any[]> {
        const query: any = { attributeId, status: 'ACTIVE', deletedAt: null };
        if (!empty(allowedValueIds) && allowedValueIds.length > 0) query._id = { $in: allowedValueIds };

        const values = await AttributeValue.find(query).sort({ sortOrder: 1, value: 1 }).lean();
        return values.map((v: any) => ({
            id: getStr(v._id),
            value: getStr(v.value),
            code: getStr(v.code),
            hexCode: getStr(v.hexCode),
            image: getStr(v.image),
            sortOrder: v.sortOrder || 0,
        }));
    }
    // } resolve the list of values allowed for one attribute (restricted or all active)

    // add a bare attribute (no Attribute Set membership) using its own master defaults {
    static async expandBareAttributes(attributeIds: any[] = []): Promise<IResolvedAttribute[]> {
        if (empty(attributeIds)) return [];

        const attributes = await AttributeModel.find({ _id: { $in: attributeIds }, status: 'ACTIVE', deletedAt: null }).lean();
        const resolved: IResolvedAttribute[] = [];
        for (const attribute of attributes) {
            resolved.push({
                attributeId: getStr(attribute._id),
                name: getStr(attribute.name),
                code: getStr(attribute.code),
                inputType: getStr(attribute.inputType),
                unit: getStr(attribute.unit),
                isRequired: !!attribute.isRequired,
                isVariationAttribute: !!attribute.isVariationAttribute,
                allowedValues: await this.resolveAllowedValues(attribute._id, []),
            });
        }
        return resolved;
    }
    // } add a bare attribute (no Attribute Set membership) using its own master defaults

    // full resolution: walk an ordered category chain (root -> ... -> deepest),
    // applying each non-root node's attributeMode (INHERIT/ADD/OVERRIDE) on top
    // of whatever the chain has accumulated so far. Generalizes the old fixed
    // 2-level (category -> subcategory) resolution to an arbitrary-depth chain {
    static async resolve(categoryChain: any[] = []): Promise<{ attributeSetId: string | null; attributes: IResolvedAttribute[] }> {
        const chain = (categoryChain || []).filter((id: any) => !empty(id));
        if (empty(chain)) return { attributeSetId: null, attributes: [] };

        const nodes: any[] = await Category.find({ _id: { $in: chain }, deletedAt: null }).lean();
        const byId: any = {};
        nodes.forEach((n: any) => byId[getStr(n._id)] = n);

        const base = byId[getStr(chain[0])];
        if (empty(base)) return { attributeSetId: null, attributes: [] };

        let attributeSetId: any = base.attributeSetId || null;
        let attributes: IResolvedAttribute[] = await this.expandSet(attributeSetId);

        for (let i = 1; i < chain.length; i++) {
            const node = byId[getStr(chain[i])];
            if (empty(node)) continue;

            const mode = node.attributeMode || 'INHERIT';
            if (mode === 'INHERIT') continue;

            if (mode === 'OVERRIDE') {
                attributeSetId = node.overrideAttributeSetId || null;
                attributes = await this.expandSet(attributeSetId);
                continue;
            }

            if (mode === 'ADD') {
                const existingIds = new Set(attributes.map((a) => a.attributeId));
                const additionalIds = (node.additionalAttributeIds || []).filter((id: any) => !existingIds.has(getStr(id)));
                attributes = [...attributes, ...await this.expandBareAttributes(additionalIds)];
            }
        }

        return { attributeSetId: getStr(attributeSetId) || null, attributes };
    }
    // } full resolution

    // effective pricing helpers (product_module_specification "11.2 Variation Price Override") {
    static getEffectivePrice(product: any, variation: any): number | null {
        if (variation?.priceMode === 'OVERRIDE' && !empty(variation?.price)) return variation.price;
        return product?.pricing?.price ?? null;
    }

    static getEffectiveSalePrice(product: any, variation: any): number | null {
        if (variation?.priceMode === 'OVERRIDE' && !empty(variation?.salePrice)) return variation.salePrice;
        return product?.pricing?.salePrice ?? null;
    }

    static getStockStatus(availableStock: number, lowStockThreshold: number = 0): string {
        if (availableStock <= 0) return 'OUT_OF_STOCK';
        if (availableStock <= (lowStockThreshold || 0)) return 'LOW_STOCK';
        return 'IN_STOCK';
    }
    // } effective pricing helpers

}
