// Models
import { Category } from '../../../../models/category';
import { Product } from '../../../../models/product';

// Helpers
import { getStr } from '../../../../utils';
import Core from '../../../../core';
import * as Format from './format';
import * as Query from './query';

//--------------------------------------------------------------

// prices a whole page of products with one pricing context (no per-item queries)
const toCards = async (dealer: any, products: any[]): Promise<any[]> => {
    const ctx = await Core.DealerPricing.buildContext(dealer, products.map((p: any) => p._id));
    return products.map((p: any) => Format.productCard(p, ctx));
}

// fields a product card never needs - keeps list payloads small
const CARD_EXCLUDE = '-description -shortDescription -specifications -seo -shipping -attributes';

// visible-product counts for the given categories, counting a product once per level it sits under
const categoryItemCounts = async (categoryIds: any[]): Promise<Map<string, number>> => {
    if (!categoryIds.length) return new Map();

    const rows = await Product.aggregate([
        { $match: await Core.DealerCatalogue.visibleProductQuery() },
        { $project: { cats: { $filter: { input: { $setUnion: [['$categoryId'], ['$subcategoryId'], ['$childCategoryId']] }, cond: { $ne: ['$$this', null] } } } } },
        { $unwind: '$cats' },
        { $match: { cats: { $in: categoryIds } } },
        { $group: { _id: '$cats', count: { $sum: 1 } } },
    ]);

    return new Map(rows.map((r: any) => [getStr(r._id), r.count]));
}

const categoriesWithChildren = async (categoryIds: any[]): Promise<Set<string>> => {
    if (!categoryIds.length) return new Set();
    const parents = await Category.distinct('parentId', { parentId: { $in: categoryIds }, deletedAt: null, status: 'ACTIVE' });
    return new Set(parents.map((id: any) => getStr(id)));
}

const formatCategories = async (categories: any[]): Promise<any[]> => {
    const ids = categories.map((c: any) => c._id);
    const [counts, withChildren] = await Promise.all([categoryItemCounts(ids), categoriesWithChildren(ids)]);
    return categories.map((c: any) => Format.category(c, { itemCount: counts.get(getStr(c._id)) || 0, hasChildren: withChildren.has(getStr(c._id)) }));
}

export {
    Format,
    Query,
    toCards,
    CARD_EXCLUDE,
    formatCategories,
}
