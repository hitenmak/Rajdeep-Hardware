// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError } from '../../utils';

// Others
import Config from '../../config';
import send from './handler';

// Interfaces
import { IHelperError, ISendRet } from './interfaces';

//--------------------------------------------------------------

export default class Send {

    static async testMessage(payload: any): Promise<ISendRet | IHelperError> {
        const ERROR_KEY = 'MAIL-SEND : USER-MAIL-SIGN-UP-THANK-YOU';

        try {
            const response: any = await send({
                receiverPhoneNumber: payload?.phoneNumber,
                templateName: 'hello_world', // hello_world
                bodyParameters: [],
                buttonParameters: [],
            });
            // d({ ...response?.data }, 'Test Message Response:');

            logInfo(`[Whatsapp]: test message send: ${payload?.phoneNumber}`);

            if (response?.error) throw response.error;

            return response;
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static async otpSend(payload: any): Promise<any> {
        try {
            const response = await send({
                receiverPhoneNumber: payload?.phoneNumber,
                templateName: 'pin_no_1',
                bodyParameters: [
                    { type: 'text', text: `${payload?.pinNumber}` },
                ],
                buttonParameters: [],
            });
            // d({ ...response?.data }, 'OTP Response:');

            logInfo(`[Whatsapp]: otp send: ${payload?.phoneNumber}`);

            return response;
        } catch (error: any) {
            return { error: error?.response?.data || error?.message, data: {} };
        }
    }

    static async paymentLinkSend(payload: any): Promise<any> {
        try {
            const response = await send({
                receiverPhoneNumber: payload?.phoneNumber,
                templateName: 'payment_reminder_1',
                bodyParameters: [
                    { type: 'text', text: payload?.name }, // {{1}}
                    { type: 'text', text: `#${payload?.orderNumber}` }, // {{2}}
                ],
                buttonParameters: [
                    { type: 'text', text: payload?.paymentUrl } // {{1}}
                ],
            });
            // d({ ...response?.data }, 'Payment Response:');

            logInfo(`[Whatsapp]: payment link send: ${payload?.phoneNumber}`);

            return response;
        } catch (error: any) {
            return { error: error?.response?.data || error?.message, data: {} };
        }
    }

}