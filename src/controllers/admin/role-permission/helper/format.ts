
// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getBool, getStr } from '../../../../utils';
import Core from '../../../../core';

// Interfaces
import { IObj } from '../../../../common/interfaces';

//--------------------------------------------------------------

export const list = (rawData: IObj[], extra: IObj = {}): IObj => {
    const data = [];

    for (const r of rawData || []) {
        const rolePermissionData: any = {
            id: getStr(r?._id),
            name: getStr(r?.name),
            department: extra?.departmentData[r?.department] || {},
            createdAt: r?.createdAt || '',
        };
        data.push(rolePermissionData);
    }
    return data;
}

export const details = (rawData: IObj, extra: IObj = {}): IObj => {
    const modules: any = Core.RolePermission.getPermission(rawData?.permission?.modules, getBool(rawData?.permission?.isMaster));

    const data: any = {
        id: getStr(rawData?._id),
        name: getStr(rawData?.name),
        department: extra?.departmentData[rawData?.department] || {},
        permission: {
            isMaster: getBool(rawData?.permission?.isMaster),
            modules: modules?.permissionConfig,
        }
    };
    return data;
}
