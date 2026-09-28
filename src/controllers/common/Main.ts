import axios from 'axios';
import moment from 'moment';

// Models
import { Setting } from '../../models/setting';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getStr, getNum, getBool, makeList } from '../../utils';
import Core from '../../core';
import { Format } from './helper';
import { SignUpMemberContent } from '../../data';
import MediaManager from '../../services/media';

// Others
import { INTERNAL_MSG, ADMIN_MSG } from '../../common/messages';
import { OTP } from '../../config/Constant';
import Paystack from '../../services/paystack';

//--------------------------------------------------------------

export default class Main {

    static async getConfig(req: any, res: any): Promise<void> {
        try {
            // get setting {
            const settingData: any = await Setting.findOne().lean();
            if (empty(settingData)) throw new Error(INTERNAL_MSG.SETTING.DETAILS.NOT_FOUND);
            // } get setting

            // get currency rate {
            let currencyRateData = await Core.Kit.getCurrencyRate();
            // } get currency rate

            // get master data {
            const data: any = {
                paypalDetails: {
                    paypalCharge: getStr(1.5),
                    paypalRate: getStr(currencyRateData?.rates?.NGN || 1400)
                },

                otpDetails: {
                    otpExpireInSecond: getStr(OTP.EXPIRE_TIME_IN_SECOND)
                },
                signUpMember: SignUpMemberContent?.SIGN_UP_MEMBER || {},
                contactDetails: settingData.contactDetails || {},

                rolePermissions: (await Core.Master.getRolePermission()).data || [],
                department: (await Core.Master.getDepartment()).data || [],
                userStatus: (await Core.Master.getUserStatus()).data || [],
            };
            // } get master data

            return res.status(200).send({ status: true, message: INTERNAL_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async appVersionCheck(req: any, res: any): Promise<void> {
        try {
            // get config {
            const appTypeMaster = (await Core.Master.getAppType()) || {};
            const appTypeKeys = appTypeMaster?.keys || [];
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                appType: `required | in: ${appTypeKeys}`,
                currantVersion: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            const settingData: any = await Setting.findOne().lean();
            if (empty(settingData)) throw new Error(INTERNAL_MSG.SETTING.DETAILS.NOT_FOUND);

            let appType = body.appType;
            let appData: any = {};
            if (appType === 'ANDROID') appData = settingData?.appDetails?.androidApp || {};
            if (appType === 'IOS') appData = settingData?.appDetails?.iosApp || {};

            let currentVersion = getStr(body?.currantVersion);
            let latestVersion = getStr(appData?.latestVersion);

            let isSkippable = getBool(appData?.isSkippable);
            let isUpdateAvailable = false;
            if (currentVersion !== latestVersion) {
                // android
                if (appType === 'ANDROID') {
                    isSkippable = appData?.versionList.some((item: any) => getNum(item.version) > getNum(currentVersion)) ? false : true;

                    isUpdateAvailable = currentVersion < latestVersion ? true : false;
                }

                // ios
                if (appType === 'IOS') {
                    let iosVersion = await Core.Kit.compareIosVersions(getStr(currentVersion), getStr(latestVersion));
                    isSkippable = iosVersion > 0 ? true : false;

                    isUpdateAvailable = false; // latestVersion.localeCompare(currentVersion, undefined, { numeric: true, sensitivity: 'base' }) > 0;
                }
            }

            let data = {
                apkUrl: getStr(appData?.apkUrl),
                appLink: getStr(appData?.appLink),
                releaseNote: getStr(appData?.releaseNote),
                latestVersion: getStr(appData?.latestVersion),
                isSkippable,
                isUpdateAvailable,
                // versionList: appData?.versionList
            };
            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async bankList(req: any, res: any): Promise<void> {
        try {
            const bankList: any = await Paystack.bankList();
            if (!empty(bankList?.error?.message)) throw new Error(bankList?.error?.message);

            let data = {
                bankList: bankList?.data
            };
            return res.status(200).send({ status: true, message: bankList?.message, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}