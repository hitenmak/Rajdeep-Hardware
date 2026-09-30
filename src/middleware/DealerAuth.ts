import { Response, NextFunction } from 'express';

// Models
import { Dealer } from '../models/dealer';
import { DealerSession } from '../models/dealer-session';

// Helpers
import { empty, getStr } from '../utils';
import Core from '../core';

// Others
import { DEALER_MSG } from '../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../common/errors';

//--------------------------------------------------------------

const BEARER_REGEX = /^Bearer\s+(\S+)$/i;

export default async (req: any, res: Response, next: NextFunction) => {
    try {
        const token = getStr(req.headers?.authorization).match(BEARER_REGEX)?.[1];
        if (empty(token)) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.TOKEN.NOT_FOUND);

        // verify token {
        const { dealerId, sessionId } = await Core.DealerAuth.verifyAccessToken(token as string);
        // } verify token

        // check session - revoked on logout / password change {
        const session: any = await DealerSession.findOne({ _id: sessionId, dealerId, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
        if (empty(session)) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.TOKEN.SESSION_EXPIRED);
        // } check session

        // check dealer - re-evaluated per request so suspension takes effect immediately {
        const dealer: any = await Dealer.findOne({ _id: dealerId, deletedAt: null }).lean();
        Core.DealerAuth.assertCanAccess(dealer);
        // } check dealer

        // auth dealer {
        req.authDealer = dealer;
        req.dealerSession = session;
        req.authorizationToken = token;
        // } auth dealer

        next();
    } catch (e: any) {
        return sendApiError(res, e, '[MIDDLEWARE-DEALER-AUTH] -');
    }
}
