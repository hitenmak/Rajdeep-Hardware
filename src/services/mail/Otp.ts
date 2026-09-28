// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError } from '../../utils';

// Others
import Config from '../../config';
import mailer from './handler';

// Interfaces
import { IHelperError, ISend, ISendRet } from './interfaces';

//--------------------------------------------------------------

export default class Otp {

    static async otpMail(payload: ISend): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'MAIL-SEND : USER-OTP';

        try {
            payload.subject = `[${Config.APP.NAME}] - Your verification OTP code for ${Config.APP.NAME}`;
            payload.title = `[${Config.APP.NAME}] - Your verification OTP code for ${Config.APP.NAME}`;
            payload.description = payload.description || ``;

            const receipt: any = await mailer('user-otp', payload, payload?.attachments || []);
            logInfo(`[OTP] user otp mail send: ${payload.toEmail} - ${payload.otp}`);
            if (receipt?.error) throw receipt.error;

            return { msg: 'ok' };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}