// Models
import { RolePermission } from '../models/role-permission';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, flipOnKey, getStr, makeList, findRecords } from '../utils';
import MediaManager from '../services/media';

// Others
import * as DataHandler from '../data';

//--------------------------------------------------------------

export default class Master {

    static async getAppType(): Promise<any> {
        try {
            return {
                data: DataHandler.AppType,
                dataOnKey: flipOnKey(DataHandler.AppType, 'key'),
                keys: makeList(DataHandler.AppType, 'key'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

    static async getRolePermission(): Promise<any> {
        try {
            const record = await findRecords(RolePermission, { 'permission.isMaster': false }, { select: '_id name department permission' });
            const data: any = [];
            for (const r of (record || [])) {
                data.push({
                    id: getStr(r?._id),
                    name: getStr(r.name),
                    department: getStr(r.department),
                    // permission: r?.permission || {},
                });
            }
            return {
                data,
                dataOnKey: flipOnKey(data, 'id'),
                keys: makeList(data, 'id'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

    static async getLoginType(): Promise<any> {
        try {
            const removeKeys = ['ADMIN', 'MERCHANT'];
            const LoginTypes = DataHandler.Department.filter(role => !removeKeys.includes(role.key));

            return {
                data: LoginTypes,
                dataOnKey: flipOnKey(LoginTypes, 'key'),
                keys: makeList(LoginTypes, 'key'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

    static async getDepartment(): Promise<any> {
        try {
            return {
                data: DataHandler.Department,
                dataOnKey: flipOnKey(DataHandler.Department, 'key'),
                keys: makeList(DataHandler.Department, 'key'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

    static async getUserStatus(): Promise<any> {
        try {
            return {
                data: DataHandler.UserStatus,
                dataOnKey: flipOnKey(DataHandler.UserStatus, 'key'),
                keys: makeList(DataHandler.UserStatus, 'key'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

    static async getWithdrawalRequestAmount(): Promise<any> {
        try {
            return {
                data: DataHandler.WithdrawalRequestAmount,
                dataOnKey: flipOnKey(DataHandler.WithdrawalRequestAmount, 'key'),
                keys: makeList(DataHandler.WithdrawalRequestAmount, 'key'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

    static async getTransactionHistoryStatus(): Promise<any> {
        try {
            return {
                data: DataHandler.TransactionHistoryStatus,
                dataOnKey: flipOnKey(DataHandler.TransactionHistoryStatus, 'key'),
                keys: makeList(DataHandler.TransactionHistoryStatus, 'key'),
            };

        } catch (e: any) {
            return { error: e }
        }
    }

}