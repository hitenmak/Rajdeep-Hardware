// Models
import { Product } from '../../../models/product';
import { Category } from '../../../models/category';
import { Notification } from '../../../models/notification';

// Helpers
import { getStr } from '../../../utils';
import Core from '../../../core';
import { toCards, CARD_EXCLUDE, formatCategories } from './helper';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

const NEW_ARRIVALS_LIMIT = 10;
const HOME_CATEGORIES_LIMIT = 8;

export default class Home {

    static async index(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const newArrivalQuery = await Core.DealerCatalogue.visibleProductQuery([{ isNewArrival: true }]);

            const [newArrivals, categories, unreadNotificationCount] = await Promise.all([
                Product.find(newArrivalQuery).select(CARD_EXCLUDE).sort({ sortOrder: 1, createdAt: -1 }).limit(NEW_ARRIVALS_LIMIT).lean(),
                Category.find({ parentId: null, deletedAt: null, status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 }).limit(HOME_CATEGORIES_LIMIT).lean(),
                Notification.countDocuments({ dealerId: authDealer._id, isRead: false, deletedAt: null }),
            ]);

            const data = {
                dealer: {
                    businessName: getStr(authDealer.businessName),
                    contactName: getStr(authDealer.contactName),
                },
                unreadNotificationCount,
                newArrivals: await toCards(authDealer, newArrivals),
                categories: await formatCategories(categories),
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.CATALOGUE.HOME.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CATALOGUE-HOME] -');
        }
    }

}
