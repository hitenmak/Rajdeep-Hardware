// Models
import { CronJob } from '../../models/cron-job';
import { Notification } from '../../models/notification';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../utils';

//--------------------------------------------------------------

export default async (): Promise<void> => {
    const ERROR_KEY = `CRON-NOTIFICATION-DELETE`;

    try {
        logInfo(`${ERROR_KEY} start`);

        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        await CronJob.deleteMany({ isSended: true });

        await Notification.deleteMany({
            createdAt: { $lte: endDate }
        });

        logInfo(`${ERROR_KEY} end`);
    } catch (e: any) {
        logError(e)
    }
}