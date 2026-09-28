// Models
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';
import MediaManager from '../../../services/media';

// Others
import { INTERNAL_MSG, ADMIN_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Main {

    static async details(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentData = departmentMaster?.dataOnKey || {};

            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // get user data {
            const record: any = await User.findById(authUser?._id).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } get user data

            return res.status(200).send({ status: true, message: INTERNAL_MSG.PROFILE.DETAILS.FOUND, data: Format.details(record, { authUser, departmentData, userStatusData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentData = departmentMaster?.dataOnKey || {};

            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                firstName: `required | shorttext`,
                lastName: `required | shorttext`,
                phoneCode: `required`,
                phone: `required | phone | normalize: string`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body: any = sanitizeResult.body;

            // location {
            if (!empty(req?.body?.location)) {
                sanitizeResult = await sanitize(req?.body?.location, {
                    address1: `required | longtext`,
                    // address2: `required | longtext`,
                    city: `required | shorttext`,
                    state: `required | shorttext`,
                    country: `required | shorttext`,
                    postcode: `required | shorttext`,
                });
                if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
                body.location = sanitizeResult.body;
            }
            // } location
            // } sanitize data

            // get Lat Long {
            let locationData: any = {};
            if (body?.location) {
                locationData = await Core.Kit.getLatLong({
                    address1: body?.location?.address1 || null,
                    // address2: body?.location?.address2 || null,
                    city: body?.location?.city || null,
                    state: body?.location?.state || null,
                    country: body?.location?.country || null,
                    postcode: body?.location?.postcode || null,
                });
                if (locationData?.error) throw new Error(locationData?.error);
            }
            // } get Lat Long

            // update user {
            const record: any = await User.findByIdAndUpdate(authUser?._id, {
                firstName: body?.firstName || null,
                lastName: body?.lastName || null,
                phoneCode: body?.phoneCode || null,
                phone: body.phone || {},

                location: {
                    address1: locationData?.location?.address1 || null,
                    address2: body?.location?.address2 || null,
                    city: locationData?.location?.city || null,
                    state: locationData?.location?.state || null,
                    country: locationData?.location?.country || null,
                    postcode: locationData?.location?.postcode || null,

                    latitude: locationData?.latitude || null,
                    longitude: locationData?.longitude || null,
                },
            }, { new: true }).lean();
            if (empty(record)) throw new Error(record?.error);
            // } update user

            // get user data {
            const updatedUser: any = await User.findById(authUser?._id).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(updatedUser)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } get user data

            return res.status(200).send({ status: true, message: INTERNAL_MSG.PROFILE.UPDATE.SUCCESS, data: Format.details(updatedUser, { authUser, departmentData, userStatusData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async upload(req: any, res: any): Promise<void> {
        const { authUser } = req;

        try {
            // upload profile image {
            const file = await MediaManager.Profile.set({ profileImage: '' }, req, res);
            // } upload profile image

            // sanitize data {
            const sanitizeResult = await sanitize({ ...req?.body, ...file }, {
                profileImage: `string`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // check and remove exist file {
            if (!empty(authUser?.profileImage) && authUser?.isProfileImageLocalStorage) MediaManager.Profile.remove(authUser?.profileImage);
            // } check and remove exist file

            // upload user profile {
            const record: any = await User.findByIdAndUpdate(authUser?._id, { isProfileImageLocalStorage: true, profileImage: body?.profileImage || null }, { new: true }).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.PROFILE.UPLOAD.FAIL);
            // } upload user profile

            return res.status(200).send({ status: true, message: !empty(body?.profileImage) ? INTERNAL_MSG.PROFILE.UPLOAD.SUCCESS : INTERNAL_MSG.PROFILE.UPLOAD.UPLOAD_RESET, data: Format.profileUpload(record) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            if (rolePermission?.permission?.isMaster) throw new Error(INTERNAL_MSG.PROFILE.DELETE.NOT_DELETED);

            // update user {
            const record: any = await User.findByIdAndUpdate(authUser?._id, { deletedAt: new Date() }, { new: true }).lean();
            if (empty(record)) throw new Error(INTERNAL_MSG.PROFILE.DELETE.FAIL);
            // } update user

            return res.status(200).send({ status: true, message: INTERNAL_MSG.PROFILE.DELETE.SUCCESS, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}