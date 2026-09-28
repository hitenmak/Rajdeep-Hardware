// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../utils';
import { Format } from './helper';

// Others
import { INTERNAL_MSG } from '../../common/messages';

//--------------------------------------------------------------

export default class CmsPage {

    static async termsAndConditions(req: any, res: any): Promise<void> {
        try {
            return res.status(200).render('cms-page/terms-and-conditions', { layout: false });
        } catch (e: any) {
            return res.sendStatus(404);
        }
    }

    static async insurancePolicy(req: any, res: any): Promise<void> {
        try {
            return res.status(200).render('cms-page/insurance-policy', { layout: false });
        } catch (e: any) {
            return res.sendStatus(404);
        }
    }

}