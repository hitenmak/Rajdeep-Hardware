import ejs from 'ejs';
const firebaseAdmin = require('firebase-admin');
const firebaseServiceAccount = require('../../../secret/fire-base-push-notification-key.json');

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getError, getStr, makeList } from '../../../utils';
import MediaManager from '../../media';

// Others
import Config from '../../../config';
import { ROOT_DIR } from '../../../config/Constant';

// Interfaces
import { IHelperError } from '../interfaces';
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(firebaseServiceAccount) });

const makeTokenListHelper = (fcmTokens: any) => {
    const isMultiNotification = typeof fcmTokens === 'object';
    if (isMultiNotification && fcmTokens.length && fcmTokens[0].fcmToken) fcmTokens = makeList(fcmTokens, 'fcmToken');
    fcmTokens = isMultiNotification ? [...fcmTokens] : [fcmTokens];

    return fcmTokens;
};

export default async (payload: IObj, attachments: any = null): Promise<any | IHelperError> => {
    const ERROR_KEY = 'PUSH-NOTIFICATION';

    try {
        if (Config.APP.MODE === 'dev') {
            logInfo('PUSH NOTIFICATION FIRED BYPASS - ');
            return true;
        }

        if (empty(payload.fcmToken) && empty(payload.fcmTokens)) return false;
        payload.to = payload.fcmToken || payload.fcmTokens;

        let fcmTokens = makeTokenListHelper(payload.to);

        logSuccess('PUSH NOTIFICATION FIRED - ' + payload.title);

        if (!firebaseAdmin.apps.length) {
            firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(firebaseServiceAccount),
            });
        }

        try {
            const response = await firebaseAdmin.messaging().sendEachForMulticast({
                notification: {
                    title: payload.title || '',
                    body: payload.body || '',
                },
                tokens: fcmTokens,
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'legally_logistic',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                    headers: {
                        'apns-priority': '10',
                    },
                },
                webpush: {
                    headers: {
                        Urgency: 'high',
                    },
                },
                data: {
                    // click_action: 'FLUTTER_NOTIFICATION_CLICK',

                    // title: payload?.title || '',
                    // body: payload?.body || '',
                    content: JSON.stringify(payload?.data || {}), // if you need to send an object
                },
            });
            logSuccess('Notification send result:', response);

            response.responses.forEach((res: any, index: number) => {
                if (!res.success) logError(`❌ Token[${index}] failed: ${fcmTokens[index]} - ${res.error.message}`);
            });

            return response;
        } catch (e: any) {
            logError('❌ Error sending notification:', e);
            return false;
        }
    } catch (e: any) {
        return { error: getError(e), errorKey: ERROR_KEY };
    }
}
