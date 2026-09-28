// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, isEqual } from '../utils';

// Others
import * as DataHandler from '../data';

//--------------------------------------------------------------

export default class Permission {

    static getPermission(permission: any, isMaster: boolean = false) {
        const permissionConfig: any = structuredClone(DataHandler.RolePermission);
        const permissionPayload: any = structuredClone(DataHandler.RolePermission);
        for (const category in permissionConfig) {
            const privileges = permissionConfig[category].privileges;
            permissionPayload[category] = permissionPayload[category].privileges;

            for (const privilegesKey in privileges) {
                if (isMaster) {
                    permissionConfig[category].privileges[privilegesKey].isPermitted = privilegesKey !== 'ONLY-ASSIGN';
                    permissionPayload[category][privilegesKey] = privilegesKey !== 'ONLY-ASSIGN';
                } else {
                    permissionConfig[category].privileges[privilegesKey].isPermitted = isEqual(permission?.[category]?.[privilegesKey], true);
                    permissionPayload[category][privilegesKey] = isEqual(permission?.[category]?.[privilegesKey], true);
                }
            }
        }
        return { permissionConfig, permissionPayload };
    }

    static hasPermission(permission: any, keys: string) {
        if (empty(permission)) permission = {};
        for (const value of (keys || '').split(',')) {
            const splitKey = value.split('.');
            const module = (splitKey[0] || '').trim();
            const subModule = (splitKey[1] || '').trim();
            if (subModule) {
                if (permission?.[module]?.[subModule]) return true;

            } else if (permission?.[module]) {
                const moduleRow = permission?.[module] || {};
                const isTrue = (Object.keys(moduleRow).filter(key => moduleRow[key] == true) || []).length; // isTrue not remove is used for multiple permission check
                if (isTrue) return true;

            }
        }

        return false;
    }

}