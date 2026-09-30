// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError, getStr, getNum } from '../../utils';

// Others
import Config from '../../config';
import { OTP } from '../../config/Constant';

// Interfaces
import { IHelperError, IOtpRet, IOtpVerifyRet } from './interfaces';

//--------------------------------------------------------------

export default class Otp {

    static generate(digits: number = OTP.LENGTH): IOtpRet | IHelperError {
        const ERROR_KEY = '[OTP-GENERATE] -';

        try {
            let min = '1';
            let max = '9';

            while (min.length < digits) min += '0';
            while (max.length < digits) max += '9';

            const maxNum = parseInt(max);
            const minNum = parseInt(min);

            const otp = Config.APP.MODE === 'dev' ? getNum(getStr(Config.APP.MASTER_OTP).slice(0, digits)) : Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

            const expireInSecond = OTP.EXPIRE_TIME_IN_SECOND;
            const expireAt = new Date();

            expireAt.setSeconds(expireAt.getSeconds() + OTP.EXPIRE_TIME_IN_SECOND);

            return { otp, expireAt, expireInSecond };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static verify(otp: string, otpCode: string, expireTime: Date): IOtpVerifyRet | IHelperError {
        const ERROR_KEY = '[OTP-VERIFY] -';

        try {
            otp = getStr(otp);
            otpCode = getStr(otpCode);

            if (otp !== otpCode) throw `OTP invalid.`;

            const currentTime = new Date();
            if (new Date(expireTime) < currentTime) throw `OTP expired.`;

            return { status: true };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}