// Models
import { Dealer } from '../../../models/dealer';

// Helpers
import { empty, getBool, getClientIp, getClientAgent } from '../../../utils';
import Core from '../../../core';
import { Format, validate } from './helper';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { DEALER_AUTH } from '../../../config/Constant';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

export default class Session {

    static async login(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                email: `required | email | lowercase | normalize: lower`,
                password: `required`, // policy is enforced on set, not on login
                fcmToken: `longtext`,
                rememberMe: `boolean`,
            });

            const dealer: any = await Core.DealerAuth.findByEmail(body.email, true);
            if (empty(dealer)) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.LOGIN.INVALID);

            // account lock check {
            const lockUntil = dealer.auth?.lockUntil;
            if (lockUntil && new Date(lockUntil) > new Date()) throw new ApiError(HTTP_STATUS.LOCKED, DEALER_MSG.AUTH.LOGIN.LOCKED);
            // } account lock check

            // verify password {
            if (!Core.DealerAuth.isValidPassword(body.password, dealer.auth)) {
                const updated: any = await Dealer.findByIdAndUpdate(dealer._id, { $inc: { 'auth.failedLoginAttempts': 1 } }, { new: true }).select('+auth').lean();
                if ((updated?.auth?.failedLoginAttempts || 0) >= DEALER_AUTH.MAX_FAILED_LOGIN_ATTEMPTS) {
                    await Dealer.updateOne({ _id: dealer._id }, {
                        'auth.failedLoginAttempts': 0,
                        'auth.lockUntil': new Date(Date.now() + DEALER_AUTH.LOCK_DURATION_IN_MINUTE * 60 * 1000),
                    });
                }
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.LOGIN.INVALID);
            }
            // } verify password

            // account status is only revealed once the password is proven
            Core.DealerAuth.assertCanAccess(dealer);

            await Dealer.updateOne({ _id: dealer._id }, {
                'auth.failedLoginAttempts': 0,
                'auth.lockUntil': null,
                'auth.lastLoginAt': new Date(),
            });

            const tokens = await Core.DealerAuth.createSession(dealer._id, {
                rememberMe: body.rememberMe === undefined ? true : getBool(body.rememberMe),
                fcmToken: body.fcmToken || null,
                ipAddress: getClientIp(req),
                userAgent: getClientAgent(req),
            });

            return res.status(200).send({ status: true, message: DEALER_MSG.AUTH.LOGIN.SUCCESS, data: Format.authTokens(tokens, dealer) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-LOGIN] -');
        }
    }

    static async refresh(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                refreshToken: `required`,
            });

            const { tokens, dealer } = await Core.DealerAuth.rotateSession(body.refreshToken);

            return res.status(200).send({ status: true, message: DEALER_MSG.AUTH.TOKEN.REFRESHED, data: Format.authTokens(tokens, dealer) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-REFRESH] -');
        }
    }

    // Token validation - dealerAuth middleware has already done the work
    static async validate(req: any, res: any): Promise<void> {
        const { authDealer, dealerSession } = req;

        try {
            const data = {
                dealer: Format.dealerDetails(authDealer),
                session: { id: dealerSession?._id?.toString(), expiresAt: dealerSession?.expiresAt },
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.AUTH.TOKEN.VALID, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-VALIDATE] -');
        }
    }

    static async logout(req: any, res: any): Promise<void> {
        const { authDealer, dealerSession } = req;

        try {
            const body = await validate(req?.body, {
                allDevices: `boolean`,
            });

            if (getBool(body.allDevices)) await Core.DealerAuth.revokeAllSessions(authDealer._id, 'LOGOUT_ALL');
            else await Core.DealerAuth.revokeSession(dealerSession._id, 'LOGOUT');

            return res.status(200).send({ status: true, message: DEALER_MSG.AUTH.LOGOUT.SUCCESS, data: {} });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-LOGOUT] -');
        }
    }

}
