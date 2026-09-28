// Helpers
import { log, logInfo, logWarn, logError, logSuccess, sanitize } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';

// Others
import { API_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Main {

    static async track(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                trackingID: `required | exist: ShippingOrderParcel.trackingID (${API_MSG.SHIPPING_ORDER.DETAILS.PARCEL_NOT_FOUND})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            const data = Format.trackingHistory({});
            return res.status(200).send({ status: true, message: API_MSG.SHIPPING_ORDER.DETAILS.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}