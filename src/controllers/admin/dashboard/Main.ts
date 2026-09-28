import moment from 'moment';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../../utils';
import Core from '../../../core';
import { Format } from './helper';

// Others
import { ADMIN_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Main {

    static async index(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            const todayStartOfDay = new Date();
            todayStartOfDay.setHours(0, 0, 0, 0);

            const todayEndOfDay = new Date();
            todayEndOfDay.setHours(23, 59, 59, 999);

            let data: any = {};

            return res.status(200).send({ status: true, message: ADMIN_MSG.DASHBOARD.DETAILS.FOUND, data: Format.dashboard(data) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}