// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../utils';

// Others
import CronJobs from '../cron';

//--------------------------------------------------------------

export default async (): Promise<void> => {
    logSuccess(`[INIT] - Initialization Process Start`);

    await CronJobs();

    logSuccess(`[INIT] - Initialization Process End`);
}
