// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getError } from '../../utils';

// Others
import Config from '../../config';
import pushNotification from './handler';

// Interfaces
import { IHelperError, ISend, ISendRet } from './interfaces';

//--------------------------------------------------------------

export default class User {

    static async statusChanged(payload: ISend): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'NOTIFICATION-SEND : USER-NOTIFICATION-STATUS-CHANGED';

        try {
            payload.title = payload.title || `A new message received`;
            payload.body = payload.message || `A new message received from ${Config.APP.NAME}`;

            const receipt: any = await pushNotification(payload);
            if (receipt?.error) throw receipt.error;

            return { msg: 'ok' };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}