// Models
import { RolePermission } from '../../models/role-permission';
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

export default class SignUp {

    static async signUp(req: any, res: any): Promise<void> {
        try {
            // get config {
            const loginTypeMaster = (await Core.Master.getLoginType()) || {};
            const loginTypeKeys = loginTypeMaster?.keys || [];
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                loginType: `required | in: ${loginTypeKeys}`,

                firstName: `required | shorttext`,
                lastName: `required | shorttext`,
                email: `required | email | lowercase | normalize: lower`,
                phoneCode: `required`,
                phone: `required | phone | normalize: string`,

                password: `required | password`,
                confirmPassword: `required | password | matchwith: password (${INTERNAL_MSG.PROFILE.PASSWORD.NOT_MATCH})`,
                isTermsAndConditions: `required | boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);

            const body = sanitizeResult.body;
            // } sanitize data

            const existEmail: any = await User.findOne({ email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(ADMIN_MSG.USER.ACCOUNT.EMAIL_EXIST);

            // role find {
            const rolePermission: any = await RolePermission.findOne({ department: body?.loginType }).lean();
            if (empty(rolePermission)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DETAILS.LOGIN_TYPE_INVALID);
            // } role find

            // create user {
            let password = Token.Password.encryptPassword(body?.password);
            let payload = {
                rolePermissionId: rolePermission?._id || null,
                firstName: body?.firstName || null,
                lastName: body?.lastName || null,
                email: body?.email || null,
                isEmailVerified: false,
                phoneCode: body?.phoneCode || null,
                phone: body?.phone || null,
                password,

                isTermsAndConditions: getBool(body?.isTermsAndConditions),
                status: 'REVIEW',
            };
            const record: any = await User.create(payload);
            if (empty(record)) throw new Error(INTERNAL_MSG.AUTH.LOGIN.INVALID);
            // } create user

            return res.status(200).send({ status: true, message: INTERNAL_MSG.AUTH.SIGN_UP.REVIEW, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}