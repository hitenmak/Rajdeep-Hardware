// Models
import { Product } from '../../../models/product';

// Helpers
import Core from '../../../core';
import { Query, toCards, CARD_EXCLUDE } from '../catalogue/helper';
import { validate } from '../common/validate';
import { getPagination, paginationMeta } from '../common/pagination';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

export default class Offer {

    // "Offer" tab: products the admin flagged as Clearance Stock, only while they can still be ordered
    static async list(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                categoryId: `objectId`,
                search: `string`,
            });
            const pagination = getPagination(req?.body);

            const conditions: any[] = [{ isClearance: true }, Query.IN_STOCK_CONDITION];
            if (body.categoryId) conditions.push(Query.inCategories([body.categoryId]));
            const searchCondition = await Query.searchCondition(Query.normaliseSearch(body.search));
            if (searchCondition) conditions.push(searchCondition);

            const query = await Core.DealerCatalogue.visibleProductQuery(conditions);
            const [products, totalDocs] = await Promise.all([
                Product.find(query).select(CARD_EXCLUDE).sort({ sortOrder: 1, updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
                Product.countDocuments(query),
            ]);

            // biggest saving first on the page the dealer is looking at
            const records = (await toCards(authDealer, products)).sort((a: any, b: any) => (b.price.discountPercent || 0) - (a.price.discountPercent || 0));

            return res.status(200).send({ status: true, message: DEALER_MSG.OFFER.FOUND, data: { records, pagination: paginationMeta(pagination, totalDocs) } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-OFFER-LIST] -');
        }
    }

}
