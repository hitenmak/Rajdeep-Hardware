import { Response, NextFunction } from 'express';

// Models
import { User } from '../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../utils';
import Token from '../services/token';

// Others
import Config from '../config';
import { INTERNAL_MSG } from '../common/messages';

//--------------------------------------------------------------

export default async (req: any, res: Response, next: NextFunction) => {
    const { headers } = req;

    try {
        if (!headers?.authorization) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.NOT_FOUND);

        // verify token {
        const verifyResult: any = await Token.Jwt.verify(headers?.authorization, Config.JWT.SECRET_KEY);
        if (verifyResult?.error) throw new Error(verifyResult);
        // } verify token

        // check user {
        if (!verifyResult?._id) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.INVALID_PAYLOAD);

        const record: any = await User.findById(verifyResult?._id).populate([
            { path: 'createdBy', model: 'users' },
            { path: 'rolePermissionId', model: 'rolePermissions' },
        ]).lean();
        if (empty(record)) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.AUTH.USER_NOT_FOUND);

        if (record?.status !== 'APPROVED') throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.AUTH.USER_NOT_APPROVED);
        if (!empty(record?.deletedAt)) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.AUTH.USER_NOT_FOUND);
        if (record?.rolePermissionId?.department !== 'MERCHANT') throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.AUTH.USER_NOT_FOUND);
        if (!record?.isLoggedIn) throw new Error(INTERNAL_MSG.MIDDLEWARE_APP_AUTH.TOKEN.NOT_FOUND);
        // } check user

        // delete record.password;

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