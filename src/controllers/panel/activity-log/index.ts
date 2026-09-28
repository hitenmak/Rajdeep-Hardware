import moment from 'moment';

// Models
import { ActivityLog } from '../../../models/activity-log';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getNum } from '../../../utils';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export const MODULES = ['PRODUCT', 'DEALER', 'PURCHASE-ORDER', 'CATEGORY', 'SETTING'];
export const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'BULK_PRICE_ADJUSTMENT'];

export default class ActivityLogController {

    // system-wide activity log list - same pagination/filter pattern as
    // LoginAuditController.list, extended with module/action filters and a
    // search across the entity label / who performed it {
    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 20) || 20;

            const query: any = {};
            if (!empty(req.query?.module)) query.module = req.query.module;
            if (!empty(req.query?.action)) query.action = req.query.action;
            if (!empty(req.query?.search)) {
                const regx = { $regex: new RegExp(req.query.search, 'i') };
                query.$or = [{ entityLabel: regx }, { performedByName: regx }, { summary: regx }];
            }

            if (req.query?.dateFrom || req.query?.dateTo) {
                query.createdAt = {};
                if (req.query.dateFrom) query.createdAt.$gte = moment(req.query.dateFrom, 'YYYY-MM-DD').startOf('day').toDate();
                if (req.query.dateTo) query.createdAt.$lte = moment(req.query.dateTo, 'YYYY-MM-DD').endOf('day').toDate();
            }

            const result: any = await ActivityLog.paginate(query, {
                page, limit,
                sort: { createdAt: -1 },
                lean: true,
            });

            return res.render('panel/activity-log/list', {
                title: 'Activity Log',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
                modules: MODULES,
                actions: ACTIONS,
            });
        } catch (e: any) {
            logError(e, '[PANEL-ACTIVITY-LOG-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

}
