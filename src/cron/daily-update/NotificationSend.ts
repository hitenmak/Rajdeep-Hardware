// Models
import { CronJob } from '../../models/cron-job';
import { Notification } from '../../models/notification';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getStr, empty, findRecords } from '../../utils';

// Others
import { INTERNAL_MSG } from '../../common/messages';
import User from '../../services/push-notification/User';

//--------------------------------------------------------------

export default async (): Promise<void> => {
    const ERROR_KEY = `CRON-NOTIFICATION-SEND`;

    try {
        logInfo(`${ERROR_KEY} start`);

        // get cron data {
        let cronJobData = await findRecords(CronJob, { isSended: false }, {
            populate: [
                { path: 'userId', model: 'users', select: '_id firstName lastName email phoneCode phone status reason' },
                { path: 'shippingOrderId', model: 'shippingOrders' },
            ]
        });
        // } get cron data

        let cronJobIds: any = [];
        for (const cronJob of cronJobData) {
            if (cronJob?.cronType === 'NOTIFICATION') { // notification send
                let pushNotificationRes: any = {};
                let notification: any = {};

                // create notification {
                if (cronJob?.userId) {
                    notification = await Notification.create({
                        userId: cronJob?.userId || null,
                        actionBy: cronJob?.actionBy || null,
                        type: cronJob?.type || null,
                        title: cronJob?.title || null,
                        navigateTo: cronJob?.navigateTo || null,
                        description: cronJob?.description || null,
                        data: { type: cronJob?.type, ...cronJob?.data },
                    });
                    cronJobIds.push(getStr(cronJob?._id));
                }
                // } create notification

                pushNotificationRes = await User.statusChanged({
                    fcmToken: cronJob?.userId?.fcmToken || null,
                    title: notification?.title,
                    message: notification?.description,
                    navigateTo: notification?.navigateTo,
                    data: {
                        notificationId: notification?._id || null,
                        type: notification?.type,
                        ...notification?.data
                    },
                });

                if (pushNotificationRes?.error) {
                    logInfo(pushNotificationRes?.error);
                    continue;
                }
            }
        }

        if (!empty(cronJobIds?.length) && cronJobIds?.length > 0) await CronJob.deleteMany({ _id: { $in: cronJobIds } });

        logInfo(`${ERROR_KEY} end`);
    } catch (e: any) {
        logError(e)
    }
}