// Models
import { User } from '../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, getBool, lower, sanitize, } from '../../utils';
import Token from '../../services/token';
import { Format } from './helper';

// Others
import { INTERNAL_MSG, ADMIN_MSG } from '../../common/messages';
import { BASIC_AUTH_ROUTE_GROUPS } from '../../config/Constant';
import Core from '../../core';

//--------------------------------------------------------------

export default class SignIn {

    static async adminLogin(req: any, res: any): Promise<void> {
        try {
            // get config {
            const rolePermissionMaster = (await Core.Master.getRolePermission()) || {};
            const rolePermissionData = rolePermissionMaster?.dataOnKey || {};

            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                email: `required | email | lowercase | normalize: lower`,
                password: `required | password`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // get user data {
            const getUser: any = await User.findOne({
                email: body.email,
                deletedAt: null
            }).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(getUser)) throw new Error(INTERNAL_MSG.AUTH.LOGIN.INVALID);
            // } get user data

            // check role permission department {
            if (!getUser?.rolePermissionId?.permission?.isMaster) throw new Error(INTERNAL_MSG.AUTH.LOGIN.INVALID);
            // } check role permission department

            // update user {
            const updateUser: any = await User.findByIdAndUpdate(getUser._id, { isLoggedIn: true, fcmToken: body?.fcmToken || null }, { new: true }).lean();
            if (updateUser?.error) throw new Error(updateUser?.error);
            // } update user

            let data = {};
            if (updateUser?.isEmailVerified) { // check email verified or not
                // check is master password then buy pass all {
                if (empty(updateUser?.password?.hash) && empty(updateUser?.password?.salt)) throw new Error(INTERNAL_MSG.AUTH.LOGIN.INVALID);
                if (empty(updateUser) || (!Token.Password.verifyPassword(body.password, updateUser.password.hash, updateUser.password.salt))) throw new Error(INTERNAL_MSG.AUTH.LOGIN.INVALID);
                // } check is master password then buy pass all

                // get user data {
                const record: any = await User.findById(updateUser?._id).populate([
                    { path: 'createdBy', model: 'users' },
                    { path: 'rolePermissionId', model: 'rolePermissions' }
                ]).lean();
                if (empty(record)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
                // } get user data

                // generate access token {
                const accessToken = Token.Jwt.sign({ _id: updateUser._id });
                // } generate access token

                data = Format.loginDetails(record, { accessToken, rolePermissionData, userStatusData });
            } else {
                // set email otp {
                const emailOtpSendRes: any = await Core.Otp.emailOtpSend(updateUser?._id);
                if (emailOtpSendRes?.error) throw new Error(emailOtpSendRes?.error);
                // } set email otp

                // generate basic token {
                const basicToken: any = await Core.TokenHandler.setBasicToken({
                    id: updateUser._id,
                    allowRoute: BASIC_AUTH_ROUTE_GROUPS.SIGN_UP_OTP_VERIFICATION,
                });
                if (basicToken.error) throw basicToken;
                // } generate basic token

                data = {
                    email: updateUser?.email || null,
                    otpExpireInSecond: emailOtpSendRes?.expireInSecond || null,
                    token: basicToken?.token || null,
                };
                data = Format.signUpOtpSend(data);
            }

            return res.status(200).send({ status: true, message: INTERNAL_MSG.AUTH.LOGIN.SUCCESS, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async logout(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            const updateUser: any = await User.findByIdAndUpdate(authUser?._id, { fcmToken: null, isLoggedIn: false }, { new: true }).lean();
            if (empty(updateUser)) throw new Error(INTERNAL_MSG.AUTH.LOGOUT.FAIL);

            return res.status(200).send({ status: true, message: INTERNAL_MSG.AUTH.LOGOUT.SUCCESS, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}