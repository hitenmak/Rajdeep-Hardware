// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getBool, getStr } from '../../../../utils';
import MediaManager from '../../../../services/media';

// Interfaces
import { IObj } from '../../../../common/interfaces';

//--------------------------------------------------------------

export const report = (rawData: IObj[], extra: IObj = {}): IObj => {
    const data = [];

    for (const r of rawData || []) {
        data.push({
            id: getStr(r?._id),
            profileImageUrl: getStr(r?.isProfileImageLocalStorage ? MediaManager.Profile.get(r?.profileImage) : r?.profileImage),
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
            createdBy: {
                id: getStr(r?.createdBy?._id),
                firstName: getStr(r?.createdBy?.firstName),
                lastName: getStr(r?.createdBy?.lastName),
                profileImageUrl: getStr(r?.createdBy?.isProfileImageLocalStorage ? MediaManager.Profile.get(r?.createdBy?.profileImage) : r?.createdBy?.profileImage),
            },
            status: extra?.userStatusData[r?.status] || {},
            createdAt: r?.createdAt || '',
        });
    }

    return data;
}
