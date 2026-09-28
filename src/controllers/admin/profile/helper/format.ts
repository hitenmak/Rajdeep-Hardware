// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getBool, getStr } from '../../../../utils';
import Core from '../../../../core';
import MediaManager from '../../../../services/media';

// Interfaces
import { IObj } from '../../../../common/interfaces';

//--------------------------------------------------------------

export const details = (rawData: IObj, extra: IObj = {}): IObj => {
    let rolePermissionData: any = {};
    if (rawData?.rolePermissionId?.department !== 'MERCHANT') {
        rolePermissionData = {
            rolePermission: {
                id: getStr(rawData?.rolePermissionId?._id),
                isMaster: getBool(rawData?.rolePermissionId?.permission?.isMaster),
                name: getStr(rawData?.rolePermissionId?.name),
                department: extra?.departmentData?.[rawData?.rolePermissionId?.department] || {},
            }
        };
    }

    const data: any = {
        id: getStr(rawData?._id),
        createdBy: {
            id: getStr(rawData?.createdBy?._id),
            firstName: getStr(rawData?.createdBy?.firstName),
            lastName: getStr(rawData?.createdBy?.lastName),
            profileImageUrl: getStr(rawData?.createdBy?.isProfileImageLocalStorage ? MediaManager.Profile.get(rawData?.createdBy?.profileImage) : rawData?.createdBy?.profileImage),
        },
        ...rolePermissionData,
        notificationCount: getStr(extra?.notificationCount || 0),
        firstName: getStr(rawData?.firstName),
        lastName: getStr(rawData?.lastName),
        email: getStr(rawData?.email),
        isEmailVerified: getBool(rawData?.isEmailVerified),
        phoneCode: getStr(rawData?.phoneCode),
        phone: getStr(rawData?.phone),
        profileImageUrl: getStr(rawData?.isProfileImageLocalStorage ? MediaManager.Profile.get(rawData?.profileImage) : rawData?.profileImage),
        location: {
            address1: getStr(rawData?.location?.address1),
            address2: getStr(rawData?.location?.address2),
            city: getStr(rawData?.location?.city),
            state: getStr(rawData?.location?.state),
            country: getStr(rawData?.location?.country),
            postcode: getStr(rawData?.location?.postcode),

            latitude: getStr(rawData?.location?.latitude),
            longitude: getStr(rawData?.location?.longitude),
        },

        isTermsAndConditions: getBool(rawData?.isTermsAndConditions),
        status: extra?.userStatusData[rawData?.status] || {},
        reason: getStr(rawData?.reason),
    };
    return data;
}

export const profileUpload = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        id: getStr(rawData?._id),
        profileImage: getStr(rawData?.profileImage),
        url: getStr(rawData?.isProfileImageLocalStorage ? MediaManager.Profile.get(rawData?.profileImage) : rawData?.profileImage),
    };
    return data;
}

export const passwordSet = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        accessToken: getStr(rawData?.accessToken),
    };
    return data;
}

export const mfa2faQrCode = (rawData: IObj, extra: IObj = {}): IObj => {
    const data = rawData?.mfa2faContent;

    return data;
}

export const bankDetails = (rawData: IObj, extra: IObj = {}): IObj => {
    const data = {
        bank: {
            slug: getStr(rawData?.bank?.slug),
            code: getStr(rawData?.bank?.code),
            country: getStr(rawData?.bank?.country),
            currency: getStr(rawData?.bank?.currency),
            type: getStr(rawData?.bank?.type),
            name: getStr(rawData?.bank?.name),
            branchName: getStr(rawData?.bank?.name),
            accountNumber: getStr(rawData?.bank?.accountNumber),
            accountName: getStr(rawData?.bank?.accountName),
        },
    };
    return data;
}
