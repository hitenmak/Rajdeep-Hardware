import _ from 'lodash';

// Models
import { Product } from '../../../models/product';
import { Category } from '../../../models/category';
import { Dealer } from '../../../models/dealer';

// Helpers
import { getStr } from '../../../utils';
import Core from '../../../core';
import { Format, Query } from './helper';
import { validate } from '../common/validate';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

const SUGGESTION_LIMIT = 5;
const MIN_SUGGESTION_LENGTH = 2;

const recentSearches = (dealer: any): any[] => (dealer?.recentSearches || []).map((r: any) => ({ term: getStr(r.term), searchedAt: r.searchedAt }));

export default class Search {

    // type-ahead: matching products and categories; does not record the search
    static async suggestions(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                search: `required | string`,
                searchBy: `in: ${Query.SEARCH_BY.join(',')}`,
            });
            const search = Query.normaliseSearch(body.search);

            let products: any[] = [];
            let categories: any[] = [];
            if (search.length >= MIN_SUGGESTION_LENGTH) {
                const productCondition = await Query.searchCondition(search, body.searchBy || 'all');
                const productQuery = await Core.DealerCatalogue.visibleProductQuery([productCondition]);
                const searchCategories = ['all', 'category'].includes(body.searchBy || 'all');

                [products, categories] = await Promise.all([
                    Product.find(productQuery).select('_id name baseSku productCode images categoryId').sort({ featured: -1, name: 1 }).limit(SUGGESTION_LIMIT).lean(),
                    searchCategories ? Category.find({ name: Query.searchRegex(search), deletedAt: null, status: 'ACTIVE' }).select('_id name slug').sort({ level: 1, name: 1 }).limit(SUGGESTION_LIMIT).lean() : [],
                ]);
            }

            // "Monarch Brass Door Handle - in Door Handles"
            const productCategoryIds = _.uniq(products.map((p: any) => getStr(p.categoryId)).filter(Boolean));
            const productCategories = productCategoryIds.length ? await Category.find({ _id: { $in: productCategoryIds } }).select('_id name slug').lean() : [];
            const categoryById = Object.fromEntries(productCategories.map((c: any) => [getStr(c._id), c]));

            const data = {
                products: products.map((p: any) => ({
                    id: getStr(p._id),
                    name: getStr(p.name),
                    sku: getStr(p.baseSku) || getStr(p.productCode),
                    imageUrl: Format.primaryImageUrl(p),
                    category: Format.categoryRef(categoryById[getStr(p.categoryId)]),
                })),
                categories: categories.map((c: any) => Format.categoryRef(c)),
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.SEARCH.SUGGESTIONS_FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-SEARCH-SUGGESTIONS] -');
        }
    }

    static async recent(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            // authDealer is loaded by middleware before any write in this request, so re-read
            const dealer: any = await Dealer.findById(authDealer._id).select('recentSearches').lean();
            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.SEARCH.RECENT_FOUND, data: { records: recentSearches(dealer) } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-SEARCH-RECENT] -');
        }
    }

    static async removeRecent(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                term: `required | string`,
            });

            const term = Query.normaliseSearch(body.term);
            const dealer: any = await Dealer.findByIdAndUpdate(
                authDealer._id,
                { $pull: { recentSearches: { term: new RegExp(`^${_.escapeRegExp(term)}$`, 'i') } } },
                { new: true },
            ).select('recentSearches').lean();

            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.SEARCH.RECENT_REMOVED, data: { records: recentSearches(dealer) } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-SEARCH-RECENT-REMOVE] -');
        }
    }

    static async clearRecent(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            await Dealer.updateOne({ _id: authDealer._id }, { recentSearches: [] });
            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.SEARCH.RECENT_CLEARED, data: { records: [] } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-SEARCH-RECENT-CLEAR] -');
        }
    }

}
