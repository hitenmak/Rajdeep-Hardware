import moment from 'moment';

// Models
import { LoginAudit } from '../../../models/login-audit';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getNum } from '../../../utils';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class LoginAuditController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 20) || 20;

            const query: any = {};
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.search)) query.email = { $regex: new RegExp(req.query.search, 'i') };

            if (req.query?.dateFrom || req.query?.dateTo) {
                query.createdAt = {};
                if (req.query.dateFrom) query.createdAt.$gte = moment(req.query.dateFrom, 'YYYY-MM-DD').startOf('day').toDate();
                if (req.query.dateTo) query.createdAt.$lte = moment(req.query.dateTo, 'YYYY-MM-DD').endOf('day').toDate();
            }

            const result: any = await LoginAudit.paginate(query, {
                page, limit,
                sort: { createdAt: -1 },
                lean: true,
            });

            return res.render('panel/login-audit/list', {
                title: 'Login Audit',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
            });
        } catch (e: any) {
            logError(e, '[PANEL-LOGIN-AUDIT-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

}
