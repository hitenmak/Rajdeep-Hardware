// Models
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, sanitize } from '../../../utils';
import { Format } from './helper';
import Token from '../../../services/token';
import QRCode from '../../../services/qr-code';
import { OTP } from '../../../config/Constant';
import Config from '../../../config';
import { Mfa2faContent } from '../../../data';

// Others
import { ADMIN_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Mfa2fa {

    static async getQrCode(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            const qrCodeName = `${Config.APP.NAME}`;
            const makeSecrete = Token.Mfa.generateSecrete(qrCodeName);

            // update user {
            const mfa2fa = {
                secret: authUser?.mfa2fa?.secret || null,
                unverifiedSecret: makeSecrete || null,
                verifyAppName: authUser?.mfa2fa?.verifyAppName || null,
                isActive: authUser?.mfa2fa?.isActive || false,
                activeAt: authUser?.mfa2fa?.activeAt || null
            };

            const updateUser: any = await User.findByIdAndUpdate(authUser?._id, { mfa2fa }, { new: true }).lean();
            if (empty(updateUser)) throw new Error(updateUser?.error);
            // } update user

            // generate QR Code {
            const makeQrData = QRCode.generate(makeSecrete.OTPAuthURL);
            makeQrData.value = makeSecrete.base32;
            // } generate QR Code

            Mfa2faContent.ADMIN_MFA_2FA_QR_CODE.steps.forEach((r: any) => {
                if (r.type === 'QR-CODE') {
                    r.data.base64 = makeQrData.base64;
                    r.data.value = makeQrData.value;
                }
            });

            const data: any = {
                mfa2faContent: Mfa2faContent.ADMIN_MFA_2FA_QR_CODE
            };

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.MFA2FA.QR_CODE_GENERATED, data: Format.mfa2faQrCode(data) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async verify(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                otp: `required | maxlength:${OTP.LENGTH}`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // verify {
            const verify = Token.Mfa.verifySecrete(getStr(body.otp), authUser?.mfa2fa?.unverifiedSecret);
            if (!verify) throw new Error(ADMIN_MSG.USER.MFA2FA.INVALID);
            // } verify

            // update user {
            const mfa2faData = {
                secret: authUser?.mfa2fa?.unverifiedSecret ? authUser?.mfa2fa.unverifiedSecret : (authUser?.mfa2fa?.secret || null),
                unverifiedSecret: null,
                verifyAppName: body?.verifyAppName,
                isActive: true,
                activeAt: new Date()
            };
            const mfaEmailData = {
                ...authUser?.mfaEmail,
                isActive: false,
            };

            const updateUser: any = await User.findByIdAndUpdate(authUser?._id, { mfa2fa: mfa2faData, mfaEmail: mfaEmailData }, { new: true }).lean();
            if (empty(updateUser)) throw new Error(updateUser?.error);
            // } update user

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.MFA2FA.ACTIVATED, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async reactive(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            if (empty(authUser?.mfa2fa?.secret?.ascii) || empty(authUser?.mfa2fa?.secret?.base32)) throw new Error(ADMIN_MSG.USER.MFA2FA.RE_GENERATE);

            // update user {
            const mfa2faData = {
                ...authUser?.mfa2fa,
                isActive: true,
                activeAt: new Date()
            };
            const mfaEmailData = {
                ...authUser?.mfaEmail,
                isActive: false,
            };

            const updateUser: any = await User.findByIdAndUpdate(authUser?._id, { mfa2fa: mfa2faData, mfaEmail: mfaEmailData }, { new: true }).lean();
            if (updateUser?.error) throw new Error(updateUser?.error);
            // } update user

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.MFA2FA.ACTIVATED, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}