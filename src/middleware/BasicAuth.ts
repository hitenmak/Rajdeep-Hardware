import { Response, NextFunction } from 'express';

// Models
import { User } from '../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../utils';
import Encryption from '../services/encryption';

// Others
import Config from '../config';
import { ROUTE_PREFIX } from '../routes/config';
import { INTERNAL_MSG } from '../common/messages';

//--------------------------------------------------------------

export default async (req: any, res: Response, next: NextFunction) => {
    const { headers } = req;

    try {
        if (!headers?.authorization) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.NOT_FOUND);

        // verify token {
        const token = (headers?.authorization || '').replace('Basic ', '');

        const decryptedToken = await Encryption.decrypt(token, Config.APP.KEY);
        if (!decryptedToken || decryptedToken?.error) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.INVALID);
        // } verify token

        // verify payload
        if (!decryptedToken?.id || !decryptedToken?.basicToken) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.INVALID_PAYLOAD);

        // verify token origin {
        if (decryptedToken?.allowRoute) {
            const originalUrl = req.originalUrl.replace(`${ROUTE_PREFIX.ADMIN}/`, '');
            if (!decryptedToken.allowRoute.includes(originalUrl)) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.INVALID);
        }
        // } verify token origin

        // check user {
        const record: any = await User.findById(decryptedToken?.id).populate([
            { path: 'createdBy', model: 'users' },
            { path: 'rolePermissionId', model: 'rolePermissions' },
        ]).lean();
        if (empty(record)) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.AUTH.USER_NOT_FOUND);
        if (!empty(record?.deletedAt)) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.AUTH.USER_NOT_FOUND);
        // } check user

        // check basic token {
        if (record.basicToken !== decryptedToken.basicToken) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.INVALID);
        // } check basic token

        delete record.password;

        // auth user {
        req.rolePermission = record?.rolePermissionId || {};
        req.authUser = record || {};
        req.authorizationToken = headers?.authorization?.replace('Bearer ', '');
        // } auth user

        next();
    } catch (e: any) {
        return res.send({ status: false, message: e?.log?.error || '', data: {} });
    }
}