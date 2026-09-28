import nodemailer from 'nodemailer';
import ejs from 'ejs';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getError, getStr } from '../../../utils';
import MediaManager from '../../media';

// Others
import Config from '../../../config';
import { ROOT_DIR } from '../../../config/Constant';

// Interfaces
import { IHelperError, IMailerRet } from '../interfaces';
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

const VIEW_NAME = `${ROOT_DIR}/views/email/master/layout.ejs`;

const transporter = nodemailer.createTransport({
    host: Config.MAIL.HOST,
    secure: false,
    port: Config.MAIL.SMTP_PORT,
    auth: {
        user: Config.MAIL.USER_NAME,
        pass: Config.MAIL.USER_PASSWORD,
    },
} as { host: string });

const bindConfig = () => {
    return {
        appName: Config.APP.NAME,
        appBaseUrl: Config.APP.URL,
        supportEmail: Config.APP_SUPPORT.EMAIL,

        logoImg: getStr(MediaManager.Email.get('logo-black.png?v=1')),
        fbImg: getStr(MediaManager.Email.get('fb.png')),
        instagramImg: getStr(MediaManager.Email.get('instagram.png')),
        twitterImg: getStr(MediaManager.Email.get('twitter.png')),
        googlePlayBadgeImg: getStr(MediaManager.Email.get('google-play-badge.png')),
        appStoreImg: getStr(MediaManager.Email.get('app-store.png')),

        contactEmail: 'info@legallyng.com',
        contactAddress: 'Admin Strasse 45, 68169 Mannheim, Germany',
        contactWebUrl: `https://www.legallyng.com/`,
    };
}

//--------------------------------------------------------------

export default async (template: string, payload: IObj, attachments: any = null): Promise<IMailerRet | IHelperError> => {
    const ERROR_KEY = 'MAIL-MAILER';

    try {
        // Check Validation {
        if (Config.APP.MODE === 'dev') {
            logWarn(`[${ERROR_KEY}] - fired bypass app mode is ${Config.APP.MODE} - ${payload.toEmail}`);
            return { msg: `mail send bypass app mode is ${Config.APP.MODE}` };
        }

        if (empty(payload.toEmail)) {
            logInfo(`[${ERROR_KEY}] - not fired to email not found - ${payload.toEmail}`);
            throw 'mail not fired to email not found';
        }
        // } Check Validation

        // Bind Payload {
        payload.config = bindConfig();
        payload.viewTemplate = template;
        // } Bind Payload

        // Render Html file {
        let viewName = VIEW_NAME;
        const html: any = await ejs.renderFile(viewName, payload);
        if (empty(html)) throw 'error in mail template';

        const mailPayload: any = {
            to: payload.toEmail,
            from: `${payload.config.appName} <${Config.MAIL.FROM}>`,
            subject: payload.subject,
            html,
        };
        if (!empty(attachments)) mailPayload.attachments = attachments;
        // } Render Html file

        // Send mail with transporter {
        const receipt = await transporter.sendMail(mailPayload);
        if (empty(receipt)) throw 'receipt not found';
        // } Send mail with transporter

        return { msg: 'ok' };
    } catch (e: any) {
        return { error: getError(e), errorKey: ERROR_KEY };
    }
}
