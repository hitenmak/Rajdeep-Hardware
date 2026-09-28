import mongoose from 'mongoose';

// Models
import { User } from '../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getBool, getError, getNum, getStr } from '../utils';
import Token from '../services/token';
import OtpMail from '../services/mail/Otp';

// Others
import { INTERNAL_MSG } from '../common/messages';
import Config from '../config';

// Interfaces
import { IHelperError } from '../services/token/interfaces';
import { IEmailOtpSendRet, IEmailOtpVerify } from './interfaces';

//--------------------------------------------------------------

export default class Otp {

    static async emailOtpSend(userId: mongoose.Schema.Types.ObjectId | string): Promise<IEmailOtpSendRet | IHelperError> {
        const ERROR_KEY = '[OTP-EMAIL-OTP-SET] -';

        try {
            let { otp, expireAt, expireInSecond }: any = Token.Otp.generate();
            if (empty(otp) || empty(expireAt) || empty(expireInSecond)) throw INTERNAL_MSG.OTP.NOT_GENERATE

            // user OTP set {
            otp = Config.APP.MODE === 'dev' ? Config.APP.MASTER_OTP : otp;
            const record = await User.findByIdAndUpdate(userId, {
                $set: { otp: { code: otp, expireAt } }
            }, { new: true }).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.OTP.NOT_SET);
            // } user OTP set

            // otp mail send {
            const mailPayload: any = {
                toEmail: record.email,
                otp: otp,
                data: {
                    user: {
                        firstName: record?.firstName,
                        lastName: record?.lastName,
                    }
                }
            };
            const mailRes: any = await OtpMail.otpMail(mailPayload);
            if (mailRes?.error) throw INTERNAL_MSG.MAIL.NOT_SEND;
            // } otp mail send

            return { status: true, otp, expireAt, expireInSecond };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static async emailOtpVerify(userId: string, otp: string): Promise<IEmailOtpVerify | IHelperError> {
        const ERROR_KEY = '[OTP-EMAIL-OTP-VERIFY] -';

        try {
            const record: any = await User.findById(userId).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.COMMON.DATA.NOT_FOUND);

            // OTP verification {
            const verifyRes: any = Token.Otp.verify(otp, record.otp.code, record.otp.expireAt);
            if (verifyRes.error) throw verifyRes.error;
            // } OTP verification

            // set OTP blank in user {
            const otpRecord = await User.findByIdAndUpdate(record._id, {
                $set: { otp: { code: null, expireAt: null } }
            }, { new: true }).lean();
            if (empty(otpRecord)) throw new Error(INTERNAL_MSG.OTP.NOT_SET);
            // } set OTP blank in user

            return { status: true };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static async mfa2faOtpVerify(userId: string, otp: string): Promise<IEmailOtpVerify | IHelperError> {
        const ERROR_KEY = 'OTP-2FA-OTP-VERIFY';
        try {
            const record: any = await User.findById(userId).lean();
            if (empty(record)) throw INTERNAL_MSG.COMMON.DATA.WRONG;

            // OTP verification {
            const verifyRes = Token.Mfa.verifySecrete(getStr(otp), record?.mfa2fa?.secret);
            if (!verifyRes) throw INTERNAL_MSG.OTP.INVALID;
            // } OTP verification

            return { status: true };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}