// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getBool, getStr } from '../../../../utils';
import Core from '../../../../core';
import MediaManager from '../../../../services/media';

// Interfaces
import { IObj } from '../../../../common/interfaces';

//--------------------------------------------------------------

export const details = (rawData: IObj, extra: IObj = {}): IObj => {
    const data: any = {
        id: getStr(rawData?._id),
        contactDetails: {
            email: getStr(rawData?.contactDetails?.email),
            phoneCode: getStr(rawData?.contactDetails?.phoneCode),
            phone: getStr(rawData?.contactDetails?.phone),
            website: getStr(rawData?.contactDetails?.website),
            location: {
                address1: getStr(rawData?.contactDetails?.location?.address1),
                address2: getStr(rawData?.contactDetails?.location?.address2),
                city: getStr(rawData?.contactDetails?.location?.city),
                state: getStr(rawData?.contactDetails?.location?.state),
                country: getStr(rawData?.contactDetails?.location?.country),
                postcode: getStr(rawData?.contactDetails?.location?.postcode),

                latitude: getStr(rawData?.contactDetails?.location?.latitude),
                longitude: getStr(rawData?.contactDetails?.location?.longitude),
            }
        },

        appDetails: {
            androidApp: {
                apkUrl: getStr(rawData?.appDetails?.androidApp?.apkUrl),
                appLink: getStr(rawData?.appDetails?.androidApp?.appLink),
                releaseNote: getStr(rawData?.appDetails?.androidApp?.releaseNote),
                latestVersion: getStr(rawData?.appDetails?.androidApp?.latestVersion),
                isSkippable: getBool(rawData?.appDetails?.androidApp?.isSkippable),
                versionList: rawData?.appDetails?.androidApp?.versionList || []
            },
            iosApp: {
                apkUrl: getStr(rawData?.appDetails?.iosApp?.apkUrl),
                appLink: getStr(rawData?.appDetails?.iosApp?.appLink),
                releaseNote: getStr(rawData?.appDetails?.iosApp?.releaseNote),
                latestVersion: getStr(rawData?.appDetails?.iosApp?.latestVersion),
                isSkippable: getBool(rawData?.appDetails?.iosApp?.isSkippable),
                versionList: rawData?.appDetails?.iosApp?.versionList || []
            }
        }
    };
    return data;
}
