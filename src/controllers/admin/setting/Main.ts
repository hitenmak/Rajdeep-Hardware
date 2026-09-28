// Models
import { Setting } from '../../../models/setting';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, flipOnKey, upsertOne } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';

// Others
import { INTERNAL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Main {

    static async details(req: any, res: any): Promise<void> {
        try {
            // get setting {
            const record: any = await Setting.findOne().lean();
            if (empty(record?.error)) throw new Error(record?.error);
            // } get setting

            return res.status(200).send({ status: true, message: INTERNAL_MSG.SETTING.DETAILS.FOUND, data: Format.details(record) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async set(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                contactDetails: `required | object`,
                appDetails: `required | object`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            // contact details {
            sanitizeResult = await sanitize(body?.contactDetails, {
                email: `required | email | lowercase | normalize: lower`,
                phoneCode: `required`,
                phone: `required | phone | normalize: string`,
                website: `required | longtext`,
                location: `required | object`
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.contactDetails = sanitizeResult.body;
            // } contact details

            // location {
            sanitizeResult = await sanitize(body?.contactDetails?.location, {
                address1: `required | longtext`,
                // address2: `required | longtext`,
                city: `required | longtext`,
                state: `required | longtext`,
                country: `required | shorttext`,
                postcode: `required | shorttext`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.contactDetails.location = sanitizeResult.body;
            // } location

            // app details {
            sanitizeResult = await sanitize(body?.appDetails, {
                androidApp: `required | object`,
                iosApp: `required | object`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.appDetails = sanitizeResult.body;

            sanitizeResult = await sanitize(body?.appDetails?.androidApp, {
                apkUrl: `required`,
                appLink: `required`,
                releaseNote: `required`,
                latestVersion: `required`,
                isSkippable: `required | boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.appDetails.androidApp = sanitizeResult.body;

            sanitizeResult = await sanitize(body?.appDetails?.iosApp, {
                apkUrl: `required`,
                appLink: `required`,
                releaseNote: `required`,
                latestVersion: `required`,
                isSkippable: `required | boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.appDetails.iosApp = sanitizeResult.body;
            // } app details
            // } sanitize data

            // get setting {
            const settingData: any = await Setting.findOne().lean();
            if (empty(settingData?.error)) throw new Error(settingData?.error);
            // } get setting

            let androidVersionList: any = settingData?.appDetails?.androidApp?.versionList || [];
            let androidVersionData: any = flipOnKey(androidVersionList, 'version') || {};
            if (empty(androidVersionData?.[body.appDetails.androidApp?.latestVersion]) && !body.appDetails.androidApp?.isSkippable) androidVersionList.push({ version: body.appDetails.androidApp?.latestVersion });
            if (!empty(androidVersionData?.[body.appDetails.androidApp?.latestVersion]) && body.appDetails.androidApp?.isSkippable) androidVersionList = androidVersionList.filter((item: any) => item.version !== body.appDetails.androidApp?.latestVersion);

            let iosVersionList: any = settingData?.appDetails?.iosApp?.versionList || [];
            let iosVersionData: any = flipOnKey(iosVersionList, 'version') || {};
            if (empty(iosVersionData?.[body.appDetails.iosApp?.latestVersion]) && !body.appDetails.iosApp?.isSkippable) iosVersionList.push({ version: body.appDetails.iosApp?.latestVersion });
            if (!empty(iosVersionData?.[body.appDetails.iosApp?.latestVersion]) && body.appDetails.iosApp?.isSkippable) iosVersionList = iosVersionList.filter((item: any) => item.version !== body.appDetails.iosApp?.latestVersion);

            // get Lat Long {
            let locationData: any = {};
            if (body?.contactDetails?.location) {
                locationData = await Core.Kit.getLatLong({
                    address1: body?.contactDetails?.location?.address1 || null,
                    // address2: body?.contactDetails?.location?.address2 || null,
                    city: body?.contactDetails?.location?.city || null,
                    state: body?.contactDetails?.location?.state || null,
                    country: body?.contactDetails?.location?.country || null,
                    postcode: body?.contactDetails?.location?.postcode || null,
                });
                if (locationData?.error) throw new Error(locationData?.error);
            }
            // } get Lat Long

            // update setting {
            let payload = {
                ...settingData,
                contactDetails: {
                    email: body?.contactDetails?.email || null,
                    phoneCode: body?.contactDetails?.phoneCode || null,
                    phone: body?.contactDetails?.phone || null,
                    website: body?.contactDetails?.website || null,
                    location: {
                        address1: locationData?.location?.address1 || null,
                        address2: body?.contactDetails?.location?.address2 || null,
                        city: locationData?.location?.city || null,
                        state: locationData?.location?.state || null,
                        country: locationData?.location?.country || null,
                        postcode: locationData?.location?.postcode || null,

                        latitude: locationData?.latitude || null,
                        longitude: locationData?.longitude || null
                    },
                },

                appDetails: {
                    androidApp: {
                        apkUrl: body?.appDetails?.androidApp?.apkUrl || null,
                        appLink: body?.appDetails?.androidApp?.appLink || null,
                        releaseNote: body?.appDetails?.androidApp?.releaseNote || null,
                        latestVersion: body?.appDetails?.androidApp?.latestVersion || null,
                        isSkippable: body?.appDetails?.androidApp?.isSkippable,
                        versionList: androidVersionList,
                    },
                    iosApp: {
                        apkUrl: body?.appDetails?.iosApp?.apkUrl || null,
                        appLink: body?.appDetails?.iosApp?.appLink || null,
                        releaseNote: body?.appDetails?.iosApp?.releaseNote || null,
                        latestVersion: body?.appDetails?.iosApp?.latestVersion || null,
                        isSkippable: body?.appDetails?.iosApp?.isSkippable,
                        versionList: iosVersionList,
                    }
                }
            };

            const updateSetting: any = await upsertOne(Setting, { _id: settingData._id }, payload);
            if (empty(updateSetting)) throw new Error(INTERNAL_MSG.SETTING.SET.FAILED);
            // } update setting

            return res.status(200).send({ status: true, message: INTERNAL_MSG.SETTING.SET.SUCCESS, data: Format.details(updateSetting) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}