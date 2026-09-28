// Models
import { CronJob } from '../../models/cron-job';
import { Setting } from '../../models/setting';
import { User } from '../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, lower, sanitize, } from '../../utils';
import Token from '../../services/token';
import { Format } from './helper';

// Others
import { INTERNAL_MSG, ADMIN_MSG } from '../../common/messages';
import { OTP, BASIC_AUTH_ROUTE_GROUPS } from '../../config/Constant';
import Core from '../../core';

//--------------------------------------------------------------

export default class SignUpOtp {

    static async verify(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // get config {
            const rolePermissionMaster = (await Core.Master.getRolePermission()) || {};
            const rolePermissionData = rolePermissionMaster?.dataOnKey || {};

            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // get setting {
            const settingData: any = await Setting.findOne().lean();
            if (empty(settingData)) throw new Error(INTERNAL_MSG.SETTING.DETAILS.NOT_FOUND);
            // } get setting

            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                otp: `required | exactlength: ${OTP.LENGTH}`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // verify otp {
            const emailOtpVerifyRes: any = await Core.Otp.emailOtpVerify(authUser?._id, body.otp);
            if (emailOtpVerifyRes?.error) throw new Error(emailOtpVerifyRes?.error);
            // } verify otp

            // user basic token blank {
            const updateUser: any = await User.findByIdAndUpdate(authUser?._id, {
                isEmailVerified: true,
                isLoggedIn: true,
                basicToken: null,
                fcmToken: body?.fcmToken || null
            }, { new: true }).lean();
            if (empty(updateUser)) throw new Error(updateUser?.error);
            // } user basic token blank

            // cron job set {
            let statusLabel = userStatusData[updateUser.status]?.label || null;
            if (statusLabel) {
                await CronJob.insertMany([
                    {
                        userId: updateUser?._id || null,
                        actionBy: authUser?._id,
                        cronType: 'MAIL',
                        isAdminMail: true,

                        type: `ADMIN-MAIL-USER-SIGN-UP`,
                    },
                    {
                        userId: updateUser?._id || null,
                        actionBy: authUser?._id,
                        cronType: 'MAIL',
                        isAdminMail: false,

                        type: `USER-MAIL-SIGN-UP-THANK-YOU`,
                    }
                ]);
            }
            // } cron job set

            // get user data {
            const record: any = await User.findById(updateUser?._id).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } get user data

            // generate access token {
            const accessToken = Token.Jwt.sign({ _id: authUser?._id });
            let data = Format.loginDetails(record, { accessToken, rolePermissionData, userStatusData });
            // } generate access token

            return res.status(200).send({ status: true, message: record?.status === 'APPROVED' ? INTERNAL_MSG.AUTH.SIGN_UP.SUCCESS : INTERNAL_MSG.AUTH.SIGN_UP.REVIEW, data });
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
                allowRoute: BASIC_AUTH_ROUTE_GROUPS.SIGN_UP_OTP_VERIFICATION,
            });
            if (basicToken.error) throw basicToken;
            // } generate basic token

            const data = {
                email: authUser?.email || null,
                otpExpireInSecond: emailOtpSetRes?.expireInSecond || null,
                token: basicToken?.token || null,
            };
            return res.status(200).send({ status: true, message: INTERNAL_MSG.OTP.SEND, data: Format.signUpOtpSend(data) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}