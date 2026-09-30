// Models
import { Notification as NotificationModel } from '../../../models/notification';

// Helpers
import { getStr } from '../../../utils';
import { validate } from '../common/validate';
import { getPagination, paginationMeta } from '../common/pagination';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

// Interfaces
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

const format = (n: IObj): IObj => ({
    id: getStr(n._id),
    type: getStr(n.type),
    title: getStr(n.title),
    description: getStr(n.description),
    navigateTo: getStr(n.navigateTo) || null,
    data: n.data || {},
    isRead: !!n.isRead,
    createdAt: n.createdAt,
});

const unreadCount = (dealerId: any): Promise<number> => NotificationModel.countDocuments({ dealerId, isRead: false, deletedAt: null });

export default class Notification {

    static async list(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const pagination = getPagination(req?.body);
            // dealerId in every filter scopes notifications to their owner
            const query = { dealerId: authDealer._id, deletedAt: null };

            const [records, totalDocs, unread] = await Promise.all([
                NotificationModel.find(query).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
                NotificationModel.countDocuments(query),
                unreadCount(authDealer._id),
            ]);

            const data = { unreadCount: unread, records: records.map(format), pagination: paginationMeta(pagination, totalDocs) };
            return res.status(200).send({ status: true, message: DEALER_MSG.NOTIFICATION.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-NOTIFICATION-LIST] -');
        }
    }

    static async read(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                notificationId: `required | objectId`,
            });

            const result = await NotificationModel.updateOne({ _id: body.notificationId, dealerId: authDealer._id, deletedAt: null }, { isRead: true });
            if (!result.matchedCount) throw new ApiError(HTTP_STATUS.NOT_FOUND, DEALER_MSG.NOTIFICATION.NOT_FOUND);

            return res.status(200).send({ status: true, message: DEALER_MSG.NOTIFICATION.READ, data: { unreadCount: await unreadCount(authDealer._id) } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-NOTIFICATION-READ] -');
        }
    }

    static async readAll(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            await NotificationModel.updateMany({ dealerId: authDealer._id, isRead: false, deletedAt: null }, { isRead: true });
            return res.status(200).send({ status: true, message: DEALER_MSG.NOTIFICATION.ALL_READ, data: { unreadCount: 0 } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-NOTIFICATION-READ-ALL] -');
        }
    }

}
