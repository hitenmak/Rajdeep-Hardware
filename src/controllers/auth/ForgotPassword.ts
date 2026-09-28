// Models
import { User } from '../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, sanitize, empty } from '../../utils';
import Token from '../../services/token';
import { Format } from './helper';

// Others
import { INTERNAL_MSG, ADMIN_MSG } from '../../common/messages';
import { OTP, BASIC_AUTH_ROUTE_GROUPS } from '../../config/Constant';
import Core from '../../core';

//--------------------------------------------------------------

export default class ForgotPassword {

    static async forgot(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                email: `required | email | lowercase | normalize: lower`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // get user data {
            const record: any = await User.findOne({ email: body.email, deletedAt: null }).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.AUTH.FORGOT_PASSWORD.INVALID_EMAIL);
            // } get user data

            // set email otp {
            const emailOtpSendRes: any = await Core.Otp.emailOtpSend(record?._id);
            if (emailOtpSendRes?.error) throw new Error(emailOtpSendRes?.error);
            // } set email otp

            // generate basic token {
            const basicToken: any = await Core.TokenHandler.setBasicToken({
                id: record._id,
                allowRoute: BASIC_AUTH_ROUTE_GROUPS.FORGOT_PASSWORD_OTP_VERIFICATION,
            });
            if (basicToken.error) throw basicToken;
            // } generate basic token

            const data = {
                email: record?.email || null,
                otpExpireInSecond: emailOtpSendRes?.expireInSecond || null,
                token: basicToken?.token || null,
            };
            return res.status(200).send({ status: true, message: INTERNAL_MSG.OTP.SEND, data: Format.forgotPasswordOtpSend(data) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async verify(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                otp: `required | exactlength: ${OTP.LENGTH}`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // otp verify {
            const emailOtpVerifyRes: any = await Core.Otp.emailOtpVerify(authUser?._id, body.otp);
            if (emailOtpVerifyRes?.error) throw new Error(emailOtpVerifyRes?.error);
            // } otp verify

            // generate basic token {
            const basicToken: any = await Core.TokenHandler.setBasicToken({
                id: authUser?._id,
                allowRoute: BASIC_AUTH_ROUTE_GROUPS.FORGOT_PASSWORD_UPDATE,
            });
            if (basicToken.error) throw basicToken;
            // } generate basic token

            const data = {
                email: authUser?.email || null,
                token: basicToken?.token || null,
            };
            return res.status(200).send({ status: true, message: INTERNAL_MSG.OTP.VERIFIED, data: Format.forgotPasswordOtpVerify(data) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async resend(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // set email otp {
            const emailOtpSetRes: any = await Core.Otp.emailOtpSend(authUser?._id);
            if (emailOtpSetRes?.error) throw new Error(emailOtpSetRes?.error);
            // } set email otp

            // generate basic token {
            const basicToken: any = await Core.TokenHandler.setBasicToken({
                id: authUser?._id,
                allowRoute: BASIC_AUTH_ROUTE_GROUPS.FORGOT_PASSWORD_OTP_VERIFICATION,
            });
            if (basicToken.error) throw basicToken;
            // } generate basic token

            const data = {
                email: authUser?.email || null,
                otpExpireInSecond: emailOtpSetRes?.expireInSecond || null,
                token: basicToken?.token || null,
            };
            return res.status(200).send({ status: true, message: INTERNAL_MSG.OTP.SEND, data: Format.forgotPasswordOtpSend(data) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                password: `required | password`,
                // password: `required | minlength:${PASSWORD.MIN_LENGTH} | maxlength:${PASSWORD.MAX_LENGTH}`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // set password {
            const password = Token.Password.encryptPassword(body.password);
            // } set password

            // update user password {
            const record: any = await User.findByIdAndUpdate(authUser?._id, { password, isLoggedIn: true, isEmailVerified: true }, { new: true }).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.AUTH.FORGOT_PASSWORD.NOT_UPDATE);
            // } update user password

            // generate access token {
            const accessToken = Token.Jwt.sign({ _id: authUser?._id });
            // } generate access token

            return res.status(200).send({ status: true, message: INTERNAL_MSG.AUTH.FORGOT_PASSWORD.SUCCESS, data: Format.forgotPasswordUpdate({ accessToken }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}