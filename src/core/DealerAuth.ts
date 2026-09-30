import crypto from 'crypto';
import mongoose from 'mongoose';

// Models
import { Dealer } from '../models/dealer';
import { DealerSession } from '../models/dealer-session';

// Helpers
import { empty, getStr } from '../utils';
import Token from '../services/token';
import OtpMail from '../services/mail/Otp';

// Others
import Config from '../config';
import { DEALER_AUTH } from '../config/Constant';
import { DEALER_MSG } from '../common/messages';
import { ApiError, HTTP_STATUS } from '../common/errors';

// Interfaces
import { IDealerTokenPair, IDealerSessionMeta, IDealerAccessPayload, IDealerPurposePayload } from './interfaces';

//--------------------------------------------------------------

const ACCOUNT_BLOCK_REASON: { [key: string]: string } = {
    PENDING: DEALER_MSG.AUTH.ACCOUNT.PENDING,
    REJECTED: DEALER_MSG.AUTH.ACCOUNT.REJECTED,
    SUSPENDED: DEALER_MSG.AUTH.ACCOUNT.SUSPENDED,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export default class DealerAuth {

    // primitives {
    static hash(value: string): string {
        return crypto.createHash('sha256').update(value).digest('hex');
    }

    static safeEqual(a: string, b: string): boolean {
        const bufA = Buffer.from(a || '');
        const bufB = Buffer.from(b || '');
        return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    }

    static isValidPassword(password: string, auth: any): boolean {
        if (empty(auth?.password?.hash) || empty(auth?.password?.salt)) return false;
        return Token.Password.verifyPassword(password, auth.password.hash, auth.password.salt);
    }
    // } primitives


    // account {
    // Throws when the dealer exists but must not be granted access (deleted / not approved / inactive).
    static assertCanAccess(dealer: any): void {
        if (empty(dealer) || !empty(dealer?.deletedAt)) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.ACCOUNT.NOT_FOUND);
        if (dealer.approvalStatus !== 'APPROVED') throw new ApiError(HTTP_STATUS.FORBIDDEN, ACCOUNT_BLOCK_REASON[dealer.approvalStatus] || DEALER_MSG.AUTH.ACCOUNT.PENDING);
        if (dealer.status !== 'ACTIVE') throw new ApiError(HTTP_STATUS.FORBIDDEN, DEALER_MSG.AUTH.ACCOUNT.INACTIVE);
    }

    // Emails are stored as entered by the panel, so match case-insensitively.
    static findByEmail(email: string, withAuth: boolean = false): Promise<any> {
        const query = Dealer.findOne({ email, deletedAt: null }).collation({ locale: 'en', strength: 2 });
        if (withAuth) query.select('+auth');
        return query.lean();
    }
    // } account


    // purpose tokens (password OTP / password reset) {
    static signPurposeToken(audience: string, dealerId: string, expiresIn: number, payload: object = {}): string {
        return Token.Jwt.sign({ ...payload }, { audience, subject: dealerId.toString(), expiresIn });
    }

    static async verifyPurposeToken(audience: string, token: string): Promise<IDealerPurposePayload> {
        const decoded: any = await Token.Jwt.verify(getStr(token), Config.JWT.SECRET_KEY, { audience });
        if (decoded?.error || !mongoose.isValidObjectId(decoded?.sub)) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.TOKEN.INVALID);
        return { ...decoded, dealerId: decoded.sub };
    }
    // } purpose tokens


    // sessions {
    static signAccessToken(dealerId: string, sessionId: string): string {
        return Token.Jwt.sign({ sid: sessionId.toString() }, {
            audience: DEALER_AUTH.AUDIENCE.ACCESS,
            subject: dealerId.toString(),
            expiresIn: DEALER_AUTH.ACCESS_TOKEN_EXPIRES_IN_SECOND,
        });
    }

    static async verifyAccessToken(token: string): Promise<IDealerAccessPayload> {
        const decoded: any = await Token.Jwt.verify(getStr(token), Config.JWT.SECRET_KEY, { audience: DEALER_AUTH.AUDIENCE.ACCESS });
        if (decoded?.error || !mongoose.isValidObjectId(decoded?.sub) || !mongoose.isValidObjectId(decoded?.sid)) {
            throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.TOKEN.INVALID);
        }
        return { dealerId: decoded.sub, sessionId: decoded.sid };
    }

    static #newRefreshSecret(): string {
        return crypto.randomBytes(48).toString('base64url');
    }

    static #refreshExpiry(rememberMe: boolean): Date {
        const days = rememberMe ? DEALER_AUTH.REFRESH_TOKEN_EXPIRES_IN_DAY : DEALER_AUTH.SHORT_REFRESH_TOKEN_EXPIRES_IN_DAY;
        return new Date(Date.now() + days * DAY_IN_MS);
    }

    static #tokenPair(dealerId: string, sessionId: string, secret: string, refreshTokenExpiresAt: Date): IDealerTokenPair {
        return {
            tokenType: 'Bearer',
            accessToken: this.signAccessToken(dealerId, sessionId),
            accessTokenExpiresIn: DEALER_AUTH.ACCESS_TOKEN_EXPIRES_IN_SECOND,
            // refresh token = "<sessionId>.<secret>" so the session is found without a hash lookup
            refreshToken: `${sessionId}.${secret}`,
            refreshTokenExpiresAt,
        };
    }

    static async createSession(dealerId: string, meta: IDealerSessionMeta = {}): Promise<IDealerTokenPair> {
        const rememberMe = meta.rememberMe !== false;
        const secret = this.#newRefreshSecret();
        const expiresAt = this.#refreshExpiry(rememberMe);

        const session: any = await DealerSession.create({
            dealerId,
            refreshTokenHash: this.hash(secret),
            expiresAt,
            rememberMe,
            lastUsedAt: new Date(),
            fcmToken: meta.fcmToken || null,
            ipAddress: meta.ipAddress || null,
            userAgent: meta.userAgent || null,
        });

        return this.#tokenPair(dealerId, session._id.toString(), secret, expiresAt);
    }

    // Rotates the refresh token. Presenting an already-rotated token is treated as theft and kills the session.
    static async rotateSession(refreshToken: string): Promise<{ tokens: IDealerTokenPair, dealer: any }> {
        const [sessionId, secret] = getStr(refreshToken).split('.');
        if (!mongoose.isValidObjectId(sessionId) || empty(secret)) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.TOKEN.INVALID);

        const now = new Date();
        const newSecret = this.#newRefreshSecret();

        // atomic compare-and-swap on the hash so two concurrent refreshes cannot both succeed;
        // the pipeline update slides the expiry by the session's own window (Remember me or not)
        const session: any = await DealerSession.findOneAndUpdate(
            { _id: sessionId, refreshTokenHash: this.hash(secret), revokedAt: null, expiresAt: { $gt: now } },
            [{
                $set: {
                    refreshTokenHash: this.hash(newSecret),
                    lastUsedAt: now,
                    expiresAt: { $cond: [{ $eq: ['$rememberMe', false] }, this.#refreshExpiry(false), this.#refreshExpiry(true)] },
                },
            }],
            { new: true },
        ).lean();

        if (empty(session)) {
            await DealerSession.updateOne({ _id: sessionId, revokedAt: null }, { revokedAt: now, revokedReason: 'REFRESH_TOKEN_REUSE' });
            throw new ApiError(HTTP_STATUS.UNAUTHORIZED, DEALER_MSG.AUTH.TOKEN.SESSION_EXPIRED);
        }

        const dealer: any = await Dealer.findOne({ _id: session.dealerId, deletedAt: null }).lean();
        try {
            this.assertCanAccess(dealer);
        } catch (e) {
            await this.revokeSession(sessionId, 'ACCOUNT_BLOCKED');
            throw e;
        }

        return { tokens: this.#tokenPair(session.dealerId.toString(), sessionId, newSecret, session.expiresAt), dealer };
    }

    static async revokeSession(sessionId: string, reason: string): Promise<void> {
        await DealerSession.updateOne({ _id: sessionId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason });
    }

    static async revokeAllSessions(dealerId: string, reason: string, exceptSessionId?: string): Promise<void> {
        const query: any = { dealerId, revokedAt: null };
        if (exceptSessionId) query._id = { $ne: exceptSessionId };
        await DealerSession.updateMany(query, { revokedAt: new Date(), revokedReason: reason });
    }
    // } sessions


    // password OTP {
    static async sendPasswordOtp(dealer: any): Promise<{ expireInSecond: number, resendInSecond: number }> {
        const sentAt = dealer?.auth?.otp?.sentAt;
        if (sentAt && Date.now() - new Date(sentAt).getTime() < DEALER_AUTH.OTP_RESEND_INTERVAL_IN_SECOND * 1000) {
            throw new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, DEALER_MSG.PASSWORD.OTP.RESEND_TOO_SOON);
        }

        const generated: any = Token.Otp.generate(DEALER_AUTH.OTP_LENGTH);
        if (generated?.error) throw new Error(generated.error);
        const { otp, expireAt, expireInSecond } = generated;

        await Dealer.updateOne({ _id: dealer._id }, {
            'auth.otp': { hash: this.hash(getStr(otp)), expireAt, sentAt: new Date(), attempts: 0 },
            'auth.resetNonceHash': null,
        });

        const mailRes: any = await OtpMail.otpMail({
            toEmail: dealer.email,
            otp,
            data: { user: { firstName: dealer.contactName || dealer.businessName || '', lastName: '' } },
        });
        if (mailRes?.error) throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, DEALER_MSG.PASSWORD.OTP.NOT_SEND);

        return { expireInSecond, resendInSecond: DEALER_AUTH.OTP_RESEND_INTERVAL_IN_SECOND };
    }

    // Verifies the OTP and returns a single-use nonce to embed in the password-reset token.
    static async verifyPasswordOtp(dealerId: string, otp: string): Promise<string> {
        const now = new Date();

        // count the attempt atomically before comparing, so parallel guesses cannot bypass the limit
        const dealer: any = await Dealer.findOneAndUpdate(
            { _id: dealerId, deletedAt: null, 'auth.otp.hash': { $ne: null }, 'auth.otp.attempts': { $lt: DEALER_AUTH.OTP_MAX_VERIFY_ATTEMPTS } },
            { $inc: { 'auth.otp.attempts': 1 } },
            { new: true },
        ).select('+auth').lean();

        if (empty(dealer)) {
            const exists: any = await Dealer.findOne({ _id: dealerId, deletedAt: null, 'auth.otp.hash': { $ne: null } }).select('_id').lean();
            throw new ApiError(exists ? HTTP_STATUS.TOO_MANY_REQUESTS : HTTP_STATUS.BAD_REQUEST, exists ? DEALER_MSG.PASSWORD.OTP.TOO_MANY_ATTEMPTS : DEALER_MSG.PASSWORD.OTP.INVALID);
        }

        const { otp: stored } = dealer.auth;
        if (new Date(stored.expireAt) < now) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.PASSWORD.OTP.EXPIRED);
        if (!this.safeEqual(this.hash(getStr(otp)), stored.hash)) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.PASSWORD.OTP.INVALID);

        const nonce = crypto.randomBytes(16).toString('hex');
        await Dealer.updateOne({ _id: dealerId }, {
            'auth.otp.hash': null,
            'auth.otp.expireAt': null,
            'auth.resetNonceHash': this.hash(nonce),
        });

        return nonce;
    }
    // } password OTP

}
