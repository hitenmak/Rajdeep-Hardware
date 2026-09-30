// Models
import { Category as CategoryModel } from '../../../models/category';

// Helpers
import { empty } from '../../../utils';
import { Query, formatCategories } from './helper';
import { validate } from '../common/validate';
import { getPagination, paginationMeta } from '../common/pagination';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

export default class Category {

    // root categories by default; pass parentId to drill into a subcategory level
    static async list(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                parentId: `objectId`,
                search: `string`,
            });
            const pagination = getPagination(req?.body);
            const search = Query.normaliseSearch(body.search);

            const query: any = { deletedAt: null, status: 'ACTIVE' };
            // searching spans every level; browsing shows one level at a time
            if (!empty(search)) query.name = Query.searchRegex(search);
            else query.parentId = empty(body.parentId) ? null : body.parentId;

            const [categories, totalDocs] = await Promise.all([
                CategoryModel.find(query).sort({ sortOrder: 1, name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
                CategoryModel.countDocuments(query),
            ]);

            const data = {
                records: await formatCategories(categories),
                pagination: paginationMeta(pagination, totalDocs),
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.CATEGORY.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-CATEGORY-LIST] -');
        }
    }

}
