import _ from 'lodash';

// Models
import { Category } from '../../../../models/category';
import { Attribute } from '../../../../models/attribute';
import { AttributeValue } from '../../../../models/attribute-value';

// Helpers
import { empty, getStr } from '../../../../utils';

//--------------------------------------------------------------

export const SEARCH_BY = ['all', 'name', 'sku', 'category', 'material'];
export const SORT_BY = ['recommended', 'newest', 'name_asc', 'name_desc'];
export const MAX_SEARCH_LENGTH = 100;

export const SORT: { [key: string]: any } = {
    recommended: { featured: -1, sortOrder: 1, createdAt: -1 },
    newest: { createdAt: -1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
};

// user input is always escaped - a raw RegExp would allow regex injection / ReDoS
export const searchRegex = (term: string): RegExp => new RegExp(_.escapeRegExp(term), 'i');

export const normaliseSearch = (term: any): string => getStr(term).replace(/\s+/g, ' ').slice(0, MAX_SEARCH_LENGTH);

export const inCategories = (ids: any[]): any => ({
    $or: [
        { categoryId: { $in: ids } },
        { subcategoryId: { $in: ids } },
        { childCategoryId: { $in: ids } },
        { additionalCategoryIds: { $in: ids } },
    ],
});

const matchingCategoryIds = async (rx: RegExp): Promise<any[]> => {
    const rows = await Category.find({ name: rx, deletedAt: null, status: 'ACTIVE' }).select('_id').lean();
    return rows.map((r: any) => r._id);
}

// values of any attribute that represents material or finish (e.g. "Solid Brass", "Antique Gold")
const matchingMaterialValueIds = async (rx: RegExp): Promise<any[]> => {
    const attributes = await Attribute.find({ deletedAt: null, $or: [{ name: /material|finish/i }, { code: /material|finish/i }] }).select('_id').lean();
    if (!attributes.length) return [];
    const values = await AttributeValue.find({ attributeId: { $in: attributes.map((a: any) => a._id) }, deletedAt: null, $or: [{ value: rx }, { displayValue: rx }] }).select('_id').lean();
    return values.map((v: any) => v._id);
}

export const searchCondition = async (term: string, searchBy: string = 'all'): Promise<any | null> => {
    if (empty(term)) return null;
    const rx = searchRegex(term);

    const byName = { name: rx };
    const bySku = { $or: [{ baseSku: rx }, { productCode: rx }, { 'variations.sku': rx }] };
    const byCategory = async () => inCategories(await matchingCategoryIds(rx));
    const byMaterial = async () => ({
        $or: [
            { 'attributes.attributeValueId': { $in: await matchingMaterialValueIds(rx) } },
            { 'attributes.textValue': rx },
            { 'rawMaterial.type': rx },
            { 'variations.rawMaterial.type': rx },
        ],
    });

    switch (searchBy) {
        case 'name': return byName;
        case 'sku': return bySku;
        case 'category': return await byCategory();
        case 'material': return await byMaterial();
        default: return { $or: [byName, bySku, { tags: rx }, ...(await byCategory()).$or] };
    }
}

// DB-side approximation; the exact status (incl. reserved stock) is computed per product in Format
export const IN_STOCK_CONDITION = {
    $or: [
        { 'inventory.inventoryTracking': false },
        { productType: { $ne: 'VARIABLE' }, $or: [{ 'inventory.globalStock': { $gt: 0 } }, { 'inventory.allowBackorders': true }] },
        { productType: 'VARIABLE', variations: { $elemMatch: { status: 'ACTIVE', $or: [{ stockQuantity: { $gt: 0 } }, { backorderAllowed: true }] } } },
    ],
};
