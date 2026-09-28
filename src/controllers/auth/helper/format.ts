// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getBool, getNum, getStr } from '../../../utils';
import Core from '../../../core';
import MediaManager from '../../../services/media';

// Interfaces
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

export const signUpOtpSend = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        email: getStr(rawData?.email),
        otpExpireInSecond: getStr(rawData?.otpExpireInSecond),
        basicToken: getStr(rawData?.token),
    };
    return data;
}

export const loginDetails = (rawData: IObj, extra: IObj = {}): IObj => {
    let rolePermissionData = extra?.rolePermissionData;

    const data: any = {
        accessToken: getStr(extra.accessToken) || '',

        id: getStr(rawData?._id),
        firstName: getStr(rawData?.firstName),
        lastName: getStr(rawData?.lastName),
        email: getStr(rawData?.email),
        isEmailVerified: getBool(rawData?.isEmailVerified),
        rolePermission: {
            name: getStr(rawData?.rolePermissionId?.name),
            department: getStr(rawData?.rolePermissionId?.department),
        },
        profileImageUrl: getStr(rawData?.isProfileImageLocalStorage ? MediaManager.Profile.get(rawData?.profileImage) : rawData?.profileImage),
        status: extra?.userStatusData[rawData?.status] || {},
        reason: getStr(rawData?.reason),
    };
    return data;
}

export const merchantLoginDetails = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        accessToken: getStr(extra.accessToken) || '',

        id: getStr(rawData?._id),
        firstName: getStr(rawData?.firstName),
        lastName: getStr(rawData?.lastName),
        email: getStr(rawData?.email),
        isEmailVerified: getBool(rawData?.isEmailVerified),
        profileImageUrl: getStr(rawData?.isProfileImageLocalStorage ? MediaManager.Profile.get(rawData?.profileImage) : rawData?.profileImage),
        status: extra?.userStatusData[rawData?.status] || {},
        reason: getStr(rawData?.reason),
    };
    return data;
}

export const forgotPasswordOtpSend = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        email: getStr(rawData?.email),
        otpExpireInSecond: getStr(rawData?.otpExpireInSecond),
        basicToken: getStr(rawData?.token),
    };
    return data;
}

export const forgotPasswordOtpVerify = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        basicToken: getStr(rawData?.token),
    };
    return data;
}

export const forgotPasswordUpdate = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        accessToken: getStr(rawData?.accessToken),
    };
    return data;
}
