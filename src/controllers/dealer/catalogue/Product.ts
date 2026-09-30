import _ from 'lodash';

// Models
import { Product as ProductModel } from '../../../models/product';
import { Category } from '../../../models/category';
import { Dealer } from '../../../models/dealer';

// Helpers
import { empty, getBool, getStr } from '../../../utils';
import Core from '../../../core';
import { Format, Query, toCards, CARD_EXCLUDE } from './helper';
import { validate } from '../common/validate';
import { getPagination, paginationMeta } from '../common/pagination';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

export const MAX_RECENT_SEARCHES = 10;

// newest first, case-insensitive de-dupe, capped
export const saveRecentSearch = async (dealerId: any, term: string): Promise<void> => {
    await Dealer.updateOne({ _id: dealerId }, { $pull: { recentSearches: { term: new RegExp(`^${_.escapeRegExp(term)}$`, 'i') } } });
    await Dealer.updateOne({ _id: dealerId }, { $push: { recentSearches: { $each: [{ term, searchedAt: new Date() }], $position: 0, $slice: MAX_RECENT_SEARCHES } } });
}

export default class Product {

    static async list(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                search: `string`,
                searchBy: `in: ${Query.SEARCH_BY.join(',')}`,
                categoryId: `objectId`,
                inStock: `boolean`,
                newArrival: `boolean`,
                clearance: `boolean`,
                sort: `in: ${Query.SORT_BY.join(',')}`,
            });
            const pagination = getPagination(req?.body);
            const search = Query.normaliseSearch(body.search);

            const conditions: any[] = [];
            if (!empty(body.categoryId)) conditions.push(Query.inCategories([body.categoryId]));
            if (getBool(body.inStock)) conditions.push(Query.IN_STOCK_CONDITION);
            if (getBool(body.newArrival)) conditions.push({ isNewArrival: true });
            if (getBool(body.clearance)) conditions.push({ isClearance: true });
            const searchCondition = await Query.searchCondition(search, body.searchBy || 'all');
            if (searchCondition) conditions.push(searchCondition);

            const query = await Core.DealerCatalogue.visibleProductQuery(conditions);
            const [products, totalDocs] = await Promise.all([
                ProductModel.find(query).select(CARD_EXCLUDE).sort(Query.SORT[body.sort || 'recommended']).skip(pagination.skip).limit(pagination.limit).lean(),
                ProductModel.countDocuments(query),
            ]);

            // a typed search is recorded once, not on every "load more"
            if (search && pagination.page === 1) await saveRecentSearch(authDealer._id, search);

            const data = {
                records: await toCards(authDealer, products),
                pagination: paginationMeta(pagination, totalDocs),
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.PRODUCT.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-PRODUCT-LIST] -');
        }
    }

    static async details(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                productId: `required | objectId`,
            });

            const query = await Core.DealerCatalogue.visibleProductQuery([{ _id: body.productId }]);
            const product: any = await ProductModel.findOne(query).lean();
            if (empty(product)) throw new ApiError(HTTP_STATUS.NOT_FOUND, DEALER_MSG.CATALOGUE.PRODUCT.NOT_FOUND);

            const categoryIds = [product.categoryId, product.subcategoryId, product.childCategoryId].filter(Boolean);
            const [ctx, lookup, categories] = await Promise.all([
                Core.DealerPricing.buildContext(authDealer, [product._id]),
                Core.DealerCatalogue.attributeLookup([product]),
                Category.find({ _id: { $in: categoryIds } }).select('_id name slug').lean(),
            ]);
            const categoriesById = Object.fromEntries(categories.map((c: any) => [getStr(c._id), c]));

            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.PRODUCT.DETAILS_FOUND, data: Format.productDetail(product, ctx, lookup, categoriesById) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-PRODUCT-DETAILS] -');
        }
    }

}
