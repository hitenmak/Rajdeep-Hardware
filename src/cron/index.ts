/* 
* * * * *
| | | | |
| | | | +--- Day of week (0 - 7) (Sunday is 0 and 7)
| | | +----- Month (1 - 12)
| | +------- Day of month (1 - 31)
| +--------- Hour (0 - 23)
+----------- Minute (0 - 59)

* * * * *: Runs every minute.
0 12 * * *: Runs at 12:00 PM every day.
0 0 * * 0: Runs at midnight on Sundays.
*/
//--------------------------------------------------------------

import cron from 'node-cron';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../utils';

// Others
import Config from '../config';

// Process
import * as DailyUpdate from './daily-update';

// const CRON_TIMING = {'1m': '*!/3 * * * * *'};
const CRON_TIMING = {
    '1m': '* * * * *',
    '5m': '*/5 * * * *',
    '30m': '*!/30 * * * *',
    '1h': '0 * * * *',
    '1d': '0 12 * * *'
};

//--------------------------------------------------------------

export default (): any => {
    // stop cron in dev mode {
    if (['dev'].includes(Config.APP.MODE)) {
        logWarn(`[CRON] - cron is bypass app mode is ${Config.APP.MODE}`);
        return;
    }
    // } stop cron in dev mode

    logSuccess(`[CRON] - Cron jobs are activated...`);

    // every 1 minute {
    cron.schedule(CRON_TIMING['1m'], async () => {
        logInfo(`[CRON] - 1m cron process start`);

        await DailyUpdate.MailSend();
        await DailyUpdate.NotificationSend();

        logInfo(`[CRON] - 1m cron process end`);
    }).start();
    // } every 1 minute

    // every 1 hour {
    cron.schedule(CRON_TIMING['1h'], async () => {
        logInfo(`[CRON] - 1h cron process start`);

        logInfo(`[CRON] - 1h cron process end`);
    }).start();
    // } every 1 hour

    // every 1 day {
    cron.schedule(CRON_TIMING['1d'], async () => {
        logInfo(`[CRON] - 1d cron process start`);

        await DailyUpdate.NotificationDelete();

        logInfo(`[CRON] - 1d cron process end`);
    }).start();
    // } every 1 day

}
