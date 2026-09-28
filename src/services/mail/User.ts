// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError } from '../../utils';

// Others
import Config from '../../config';
import mailer from './handler';

// Interfaces
import { IHelperError, ISend, ISendRet } from './interfaces';

//--------------------------------------------------------------

export default class User {

    static async signUpThankYou(payload: ISend): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'MAIL-SEND : USER-MAIL-SIGN-UP-THANK-YOU';

        try {
            payload.subject = `Your Legally Shipping Logistic Account is Ready`;
            payload.title = payload.title || `Your account is sign up successfully`;
            payload.description = payload.description || ``;

            const receipt: any = await mailer('user-mail-sign-up-thank-you', payload, payload?.attachments || []);
            logInfo(`[User] user mail sign up thank you mail send: ${payload.toEmail}`);
            if (receipt?.error) throw receipt.error;

            return { msg: 'ok' };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static async passwordSet(payload: ISend): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'MAIL-SEND : USER-MAIL-PASSWORD-SET';

        try {
            payload.subject = `Account created - Set your Password`;
            payload.title = payload.title || `Your account is sign up successfully please set a new password`;
            payload.description = payload.description || ``;

            const receipt: any = await mailer('user-mail-password-set', payload, payload?.attachments || []);
            logInfo(`[User] user mail password set mail send: ${payload.toEmail}`);
            if (receipt?.error) throw receipt.error;

            return { msg: 'ok' };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static async statusChanged(payload: ISend): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'MAIL-SEND : USER-MAIL-STATUS-CHANGED';

        try {
            payload.subject = `Account status changes`;
            payload.title = payload.title || `Account status changes`;
            payload.description = payload.description || ``;

            const receipt: any = await mailer('user-mail-status-changed', payload, payload?.attachments || []);
            logInfo(`[User] user mail status changed mail send: ${payload.toEmail}`);
            if (receipt?.error) throw receipt.error;

            return { msg: 'ok' };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}