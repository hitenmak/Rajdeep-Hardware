// Helpers
import { getStr, getNum } from '../../../../utils';

// Interfaces
import { IObj } from '../../../../common/interfaces';
import { IDealerTokenPair } from '../../../../core/interfaces';

//--------------------------------------------------------------

// Never spread a raw dealer record into a response - it may carry the auth sub-document.
export const dealerDetails = (rawData: IObj): IObj => {
    return {
        id: getStr(rawData?._id),
        dealerCode: getStr(rawData?.dealerCode),
        businessName: getStr(rawData?.businessName),
        contactName: getStr(rawData?.contactName),
        email: getStr(rawData?.email),
        phoneCode: getStr(rawData?.phoneCode),
        phone: getStr(rawData?.phone),
        address: getStr(rawData?.address),
        city: getStr(rawData?.city),
        state: getStr(rawData?.state),
        country: getStr(rawData?.country),
        taxNumber: getStr(rawData?.taxNumber),
        status: getStr(rawData?.status),
        approvalStatus: getStr(rawData?.approvalStatus),
    };
}

export const authTokens = (tokens: IDealerTokenPair, dealer: IObj): IObj => {
    return {
        tokenType: tokens.tokenType,
        accessToken: tokens.accessToken,
        accessTokenExpiresIn: getNum(tokens.accessTokenExpiresIn),
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        dealer: dealerDetails(dealer),
    };
}

export const passwordOtpSend = (rawData: IObj): IObj => {
    return {
        email: getStr(rawData?.email),
        otpExpireInSecond: getNum(rawData?.otpExpireInSecond),
        otpLength: getNum(rawData?.otpLength),
        resendInSecond: getNum(rawData?.resendInSecond),
        token: getStr(rawData?.token),
    };
}
