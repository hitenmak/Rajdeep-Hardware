// Models
import { RolePermission } from '../../../models/role-permission';
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, sanitize, empty } from '../../../utils';
import Token from '../../../services/token';
import { Format } from './helper';

// Others
import { INTERNAL_MSG, ADMIN_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Password {

    static async set(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                token: `required | longtext | exactlength: 12 | exist: User.password.token (${INTERNAL_MSG.PROFILE.PASSWORD.INVALID_TOKEN})`,
                password: `required | password`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            const { token: user } = sanitizeResult.records;
            // } sanitize data

            // encrypt password {
            const { hash, salt } = Token.Password.encryptPassword(body.password);
            // } encrypt password

            // update user password {
            const record: any = await User.findByIdAndUpdate(user._id, {
                password: { hash, salt, token: null },
                isLoggedIn: true
            }, { new: true }).lean();
            if (empty(record)) throw new Error(record?.error);
            // } update user password

            // get user permission {
            const permission: any = await RolePermission.findOne({ _id: record?.rolePermissionId }).lean();
            if (empty(permission)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);
            // } get user permission

            // generate access token {
            const accessToken = Token.Jwt.sign({ _id: user._id });
            // } generate access token

            return res.status(200).send({ status: true, message: INTERNAL_MSG.PROFILE.PASSWORD.SUCCESS, data: Format.passwordSet({ accessToken }, { permission }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // check validation {
            const sanitizeResult = await sanitize(req?.body, {
                currentPassword: `required | password`,
                newPassword: `required | password`,
                confirmPassword: `required | password | matchwith: newPassword (${INTERNAL_MSG.PROFILE.PASSWORD.NOT_MATCH})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } check validation

            // check password {
            if (!Token.Password.verifyPassword(body.currentPassword, authUser?.password.hash, authUser?.password.salt)) throw new Error(INTERNAL_MSG.PROFILE.PASSWORD.INCORRECT);
            // } check password

            // generate Password {
            const password = Token.Password.encryptPassword(body.newPassword);
            // } generate Password

            // update user password {
            const record: any = await User.findByIdAndUpdate(authUser?._id, { password }, { new: true }).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.PROFILE.PASSWORD.FAIL);
            // } update user password

            return res.status(200).send({ status: true, message: INTERNAL_MSG.PROFILE.PASSWORD.SUCCESS, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}