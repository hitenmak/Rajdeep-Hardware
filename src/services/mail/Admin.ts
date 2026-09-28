// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getError } from '../../utils';

// Others
import Config from '../../config';
import mailer from './handler';

// Interfaces
import { IHelperError, ISend, ISendRet } from './interfaces';

//--------------------------------------------------------------

export default class Admin {

    static async userSignUp(payload: ISend): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'MAIL-SEND : ADMIN-MAIL-USER-SIGN-UP';

        try {
            payload.subject = `Your Legally Shipping Logistic In New Account Sign Up`;
            payload.title = payload.title || `New account is sign up successfully`;
            payload.description = payload.description || ``;

            const receipt: any = await mailer('admin-mail-user-sign-up', payload, payload?.attachments || []);
            logInfo(`[Admin] admin mail user sign up mail send: ${payload.toEmail}`);
            if (receipt?.error) throw receipt.error;

            return { msg: 'ok' };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}