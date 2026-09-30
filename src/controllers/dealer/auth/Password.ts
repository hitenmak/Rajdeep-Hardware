import mongoose from 'mongoose';

// Models
import { Dealer } from '../../../models/dealer';

// Helpers
import { empty } from '../../../utils';
import Token from '../../../services/token';
import Core from '../../../core';
import { Format, validate } from './helper';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { DEALER_AUTH, OTP } from '../../../config/Constant';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

const { AUDIENCE } = DEALER_AUTH;

// email rides in the token so resend answers identically for real and decoy tokens
// identical for real and decoy responses so they cannot be told apart
const OTP_META = { otpExpireInSecond: OTP.EXPIRE_TIME_IN_SECOND, otpLength: DEALER_AUTH.OTP_LENGTH, resendInSecond: DEALER_AUTH.OTP_RESEND_INTERVAL_IN_SECOND };

const signOtpToken = (dealerId: string, email: string): string => {
    return Core.DealerAuth.signPurposeToken(AUDIENCE.PASSWORD_OTP, dealerId, DEALER_AUTH.PASSWORD_OTP_TOKEN_EXPIRES_IN_SECOND, { email });
}

export default class Password {

    // Also serves first-time password setup: dealers are created in the panel without a password.
    static async forgot(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                email: `required | email | lowercase | normalize: lower`,
            });

            const dealer: any = await Core.DealerAuth.findByEmail(body.email, true);

            // unknown emails get an indistinguishable response (a token that can never verify)
            let dealerId = new mongoose.Types.ObjectId().toString();
            if (!empty(dealer)) {
                await Core.DealerAuth.sendPasswordOtp(dealer);
                dealerId = dealer._id.toString();
            }

            const data = Format.passwordOtpSend({ ...OTP_META, email: body.email, token: signOtpToken(dealerId, body.email) });
            return res.status(200).send({ status: true, message: DEALER_MSG.PASSWORD.OTP.SEND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-PASSWORD-FORGOT] -');
        }
    }

    static async resend(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                token: `required`,
            });

            const { dealerId, email } = await Core.DealerAuth.verifyPurposeToken(AUDIENCE.PASSWORD_OTP, body.token);

            const dealer: any = await Dealer.findOne({ _id: dealerId, deletedAt: null }).select('+auth').lean();
            if (!empty(dealer)) await Core.DealerAuth.sendPasswordOtp(dealer);

            const data = Format.passwordOtpSend({ ...OTP_META, email, token: signOtpToken(dealerId, email) });
            return res.status(200).send({ status: true, message: DEALER_MSG.PASSWORD.OTP.SEND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-PASSWORD-OTP-RESEND] -');
        }
    }

    static async verify(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                token: `required`,
                otp: `required | exactlength: ${DEALER_AUTH.OTP_LENGTH}`,
            });

            const { dealerId } = await Core.DealerAuth.verifyPurposeToken(AUDIENCE.PASSWORD_OTP, body.token);
            const nonce = await Core.DealerAuth.verifyPasswordOtp(dealerId, body.otp);

            const data = {
                resetToken: Core.DealerAuth.signPurposeToken(AUDIENCE.PASSWORD_RESET, dealerId, DEALER_AUTH.PASSWORD_RESET_TOKEN_EXPIRES_IN_SECOND, { nonce }),
                resetTokenExpiresIn: DEALER_AUTH.PASSWORD_RESET_TOKEN_EXPIRES_IN_SECOND,
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.PASSWORD.OTP.VERIFIED, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-PASSWORD-OTP-VERIFY] -');
        }
    }

    static async reset(req: any, res: any): Promise<void> {
        try {
            const body = await validate(req?.body, {
                resetToken: `required`,
                password: `required | password`,
                confirmPassword: `required | matchwith: password (${DEALER_MSG.PASSWORD.NOT_MATCH})`,
            });

            const { dealerId, nonce } = await Core.DealerAuth.verifyPurposeToken(AUDIENCE.PASSWORD_RESET, body.resetToken);
            if (empty(nonce)) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.PASSWORD.RESET.INVALID_TOKEN);

            // conditional on the nonce, so the reset token is single-use even under concurrency
            const updated: any = await Dealer.findOneAndUpdate(
                { _id: dealerId, deletedAt: null, 'auth.resetNonceHash': Core.DealerAuth.hash(nonce) },
                {
                    'auth.password': Token.Password.encryptPassword(body.password),
                    'auth.passwordChangedAt': new Date(),
                    'auth.resetNonceHash': null,
                    'auth.failedLoginAttempts': 0,
                    'auth.lockUntil': null,
                },
            ).lean();
            if (empty(updated)) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.PASSWORD.RESET.INVALID_TOKEN);

            await Core.DealerAuth.revokeAllSessions(dealerId, 'PASSWORD_RESET');

            return res.status(200).send({ status: true, message: DEALER_MSG.PASSWORD.RESET.SUCCESS, data: {} });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-PASSWORD-RESET] -');
        }
    }

    static async change(req: any, res: any): Promise<void> {
        const { authDealer, dealerSession } = req;

        try {
            const body = await validate(req?.body, {
                currentPassword: `required`,
                newPassword: `required | password`,
                confirmPassword: `required | matchwith: newPassword (${DEALER_MSG.PASSWORD.NOT_MATCH})`,
            });

            const dealer: any = await Dealer.findById(authDealer._id).select('+auth').lean();
            if (!Core.DealerAuth.isValidPassword(body.currentPassword, dealer?.auth)) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.PASSWORD.CHANGE.INCORRECT);
            if (body.currentPassword === body.newPassword) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.PASSWORD.CHANGE.SAME_AS_CURRENT);

            await Dealer.updateOne({ _id: authDealer._id }, {
                'auth.password': Token.Password.encryptPassword(body.newPassword),
                'auth.passwordChangedAt': new Date(),
            });

            // sign out every other device; the current session stays valid
            await Core.DealerAuth.revokeAllSessions(authDealer._id, 'PASSWORD_CHANGED', dealerSession._id);

            return res.status(200).send({ status: true, message: DEALER_MSG.PASSWORD.CHANGE.SUCCESS, data: {} });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-AUTH-PASSWORD-CHANGE] -');
        }
    }

}
