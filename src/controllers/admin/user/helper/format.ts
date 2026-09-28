// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getBool, getStr } from '../../../../utils';
import MediaManager from '../../../../services/media';

// Interfaces
import { IObj } from '../../../../common/interfaces';

//--------------------------------------------------------------

export const list = (rawData: IObj[], extra: IObj = {}): IObj => {
    const data = [];

    for (const r of rawData || []) {
        data.push({
            id: getStr(r?._id),
            createdBy: {
                id: getStr(r?.createdBy?._id),
                firstName: getStr(r?.createdBy?.firstName),
                lastName: getStr(r?.createdBy?.lastName),
                profileImageUrl: getStr(r?.createdBy?.isProfileImageLocalStorage ? MediaManager.Profile.get(r?.createdBy?.profileImage) : r?.createdBy?.profileImage),
            },
            rolePermission: {
                id: getStr(r?.rolePermissionId?._id),
                name: getStr(r?.rolePermissionId?.name),
                department: extra?.departmentData?.[r?.rolePermissionId?.department] || {}
            },
            firstName: getStr(r?.firstName),
            lastName: getStr(r?.lastName),
            email: getStr(r?.email),
            isEmailVerified: getBool(r?.isEmailVerified),
            phoneCode: getStr(r?.phoneCode),
            phone: getStr(r?.phone),
            profileImageUrl: getStr(r?.isProfileImageLocalStorage ? MediaManager.Profile.get(r?.profileImage) : r?.profileImage),
            status: extra?.userStatusData[r?.status] || {},
            reason: getStr(r?.reason),
            createdAt: r?.createdAt || '',
        });
    }

    return data;
}

export const details = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        id: getStr(rawData?._id),
        createdBy: {
            id: getStr(rawData?.createdBy?._id),
            firstName: getStr(rawData?.createdBy?.firstName),
            lastName: getStr(rawData?.createdBy?.lastName),
            profileImageUrl: getStr(rawData?.createdBy?.isProfileImageLocalStorage ? MediaManager.Profile.get(rawData?.createdBy?.profileImage) : rawData?.createdBy?.profileImage),
        },
        rolePermission: {
            id: getStr(rawData?.rolePermissionId?._id),
            isMaster: getBool(rawData?.rolePermissionId?.permission?.isMaster),
            name: getStr(rawData?.rolePermissionId?.name),
            department: extra?.departmentData?.[rawData?.rolePermissionId?.department] || {},
        },
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

export const status = (rawData: IObj, extra: IObj = {}): IObj => {

    const data = {
        id: getStr(rawData?._id),
        status: extra?.userStatusData[rawData?.status] || {},
        reason: getStr(rawData?.reason),
    };

    return data;
}
