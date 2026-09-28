import moment from 'moment';

// Models
import { RolePermission } from '../../../models/role-permission';
import { User } from '../../../models/user';
import { CronJob } from '../../../models/cron-job';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, toObjectId, sanitize, makeList, randomToken, findRecords, paginateAggregate, existsByField } from '../../../utils';
import Token from '../../../services/token';
import { Format } from './helper';
import Core from '../../../core';
import MediaManager from '../../../services/media';

// Others
import { ADMIN_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Main {

    static async create(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const roleKeys = (await Core.Master.getRolePermission()).dataOnKey || {};

            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentData = departmentMaster?.dataOnKey || {};

            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                rolePermissionId: `required | objectId | exist: RolePermission._id (${ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
                firstName: `required | shorttext`,
                lastName: `required | shorttext`,
                email: `required | email | lowercase | normalize: lower`,
                phoneCode: `required`,
                phone: `required | phone | normalize: string`,
                password: `string | password`,
                location: `required | object`
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);

            let memberRolePermission: any = await RolePermission.findById(req.body?.rolePermissionId).lean();
            if (empty(memberRolePermission)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);

            const body = sanitizeResult.body;

            // location {
            sanitizeResult = await sanitize(body?.location, {
                address1: `required | longtext`,
                // address2: `required | longtext`,
                city: `required | shorttext`,
                state: `required | shorttext`,
                country: `required | shorttext`,
                postcode: `required | shorttext`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.location = sanitizeResult.body;
            // } location
            // } sanitize data

            const existEmail: any = await User.findOne({ email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(ADMIN_MSG.USER.ACCOUNT.EMAIL_EXIST);

            // generate token for password {
            let token = null;
            let password: any = {};
            let isTokenExist = false;
            if (empty(body.password)) {
                do {
                    token = randomToken();
                    isTokenExist = await existsByField(User, 'password.token', token);
                } while (isTokenExist);
            } else {
                password = Token.Password.encryptPassword(body?.password);
            }
            // } generate token for password

            // get Lat Long {
            let locationData: any = await Core.Kit.getLatLong({
                address1: body?.location?.address1 || null,
                // address2: body?.location?.address2 || null,
                city: body?.location?.city || null,
                state: body?.location?.state || null,
                country: body?.location?.country || null,
                postcode: body?.location?.postcode || null,
            });
            if (locationData?.error) throw new Error(locationData?.error);
            // } get Lat Long

            // create user {
            const createRecord: any = await User.create({
                createdBy: authUser?._id,
                rolePermissionId: body?.rolePermissionId || null,
                firstName: body?.firstName || null,
                lastName: body?.lastName || null,
                email: body?.email || null,
                phoneCode: body?.phoneCode || null,
                phone: body?.phone || null,

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
                password: { ...password, token },
            });
            if (empty(createRecord)) throw new Error(createRecord?.error);

            let record: any = await User.findById(createRecord?._id).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } create user

            // cron job set {
            let cronJobData = [
                {
                    userId: record?._id || null,
                    actionBy: authUser?._id,
                    cronType: 'MAIL',
                    isAdminMail: true,

                    type: `ADMIN-MAIL-USER-SIGN-UP`,
                }
            ];

            if (empty(body.password)) { // set password mail send
                cronJobData.push({
                    userId: record?._id || null,
                    actionBy: authUser?._id,
                    cronType: 'MAIL',
                    isAdminMail: false,

                    type: `USER-MAIL-PASSWORD-SET`,
                });
            } else { // sign up mail send
                cronJobData.push({
                    userId: record?._id || null,
                    actionBy: authUser?._id,
                    cronType: 'MAIL',
                    isAdminMail: false,

                    type: `USER-MAIL-SIGN-UP-THANK-YOU`,
                });
            }

            await CronJob.insertMany(cronJobData);
            // } cron job set

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.ACCOUNT.CREATE_SUCCESS, data: Format.details(record, { createdByUser: authUser, roleKeys, departmentData, userStatusData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async list(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusKeys = userStatusMaster?.keys || [];
            const userStatusData = userStatusMaster?.dataOnKey || {};

            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentKeys = departmentMaster?.keys || [];
            const departmentData = departmentMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                filters: 'required',
                page: 'required | number | min: 1',
                limit: 'required | number | min: 1',
                sort: `sortObject: rolePermissionName,countryName,stateName,firstName,lastName,email,phone,status,createdAt | normalize: sortObject`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            sanitizeResult = await sanitize(body?.filters, {
                rolePermissionId: `array`,
                department: `array | arrayin: ${departmentKeys}`,
                status: `array | arrayin: ${userStatusKeys}`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.filters = sanitizeResult.body;
            // } sanitize data

            // set filters {
            const rawFilters = body.filters || {};

            // pre query {
            const preQuery: any = { _id: { $ne: toObjectId(authUser?._id) }, deletedAt: null };

            // check master admin {
            if (rolePermission.permission.isMaster) preQuery.rolePermissionId = { $ne: toObjectId(rolePermission?._id) }; // Master admin not in
            // } check master admin

            // department filter {
            let rolePermissionIds: any = [];
            if (!empty(rawFilters?.rolePermissionId) && rawFilters.rolePermissionId.length > 0) rolePermissionIds.push(...rawFilters.rolePermissionId);
            if (!empty(rawFilters?.department) && rawFilters?.department.length > 0) {
                let rolePermissions = await findRecords(RolePermission, {
                    _id: { $ne: rolePermission?._id },
                    department: { $in: rawFilters?.department }
                });
                if (rolePermissions?.error) throw new Error(rolePermissions?.error);
                rolePermissionIds.push(...makeList(rolePermissions, '_id', true));
            }
            preQuery.rolePermissionId = { $in: rolePermissionIds.map((id: string) => toObjectId(id)) };
            // } department filter

            if (!empty(rawFilters?.status) && rawFilters.status.length > 0) preQuery.status = { $in: rawFilters.status };
            if (rawFilters.dateFrom || rawFilters.dateTo) {
                const createdAt: any = {};
                if (rawFilters.dateFrom) createdAt.$gte = moment(rawFilters.dateFrom, 'YYYY-MM-DD').startOf('day').toDate();
                if (rawFilters.dateTo) createdAt.$lte = moment(rawFilters.dateTo, 'YYYY-MM-DD').endOf('day').toDate();
                preQuery.createdAt = createdAt;
            }

            // post query {
            let postQuery: any[] = [];
            if (rawFilters.search) {
                const regx = { $regex: new RegExp(rawFilters.search, 'i') };
                postQuery.push(
                    { firstName: regx },
                    { lastName: regx },
                    { email: regx },
                    { phoneCode: regx },
                    { phone: regx },
                    { reason: regx },
                    { 'rolePermissionId.name': regx },
                );
            }
            // } post query

            // options {
            const options: any = {
                page: body.page,
                limit: body.limit,
                populate: [
                    { path: 'createdBy', model: 'users' },
                    { path: 'rolePermissionId', model: 'rolePermissions' },
                ],
                collation: { locale: 'en', strength: 2 }
            };
            // } options

            if (body.sort) {
                if (!empty(body.sort.rolePermissionName)) body.sort = { 'rolePermissionId.name': body.sort.rolePermissionName };
                options.sort = body.sort;
            }
            // } set filters

            const data = await paginateAggregate(User, preQuery, postQuery, options);

            data.records = Format.list(data.records, { rolePermission, departmentData, userStatusData });
            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async details(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentData = departmentMaster?.dataOnKey || {};

            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                id: `required | objectId | exist: User._id (${ADMIN_MSG.USER.ACCOUNT.NOT_FOUND})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // get user data {
            const record: any = await User.findOne({ _id: body?.id, deletedAt: null }).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } get user data

            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data: Format.details(record, { rolePermission, departmentData, userStatusData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async upload(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // upload profile image {
            const file = await MediaManager.Profile.set({ profileImage: '' }, req, res);
            // } upload profile image

            // sanitize data {
            const sanitizeResult = await sanitize({ ...req?.body, ...file }, {
                id: `required | objectId | exist: User._id (${ADMIN_MSG.USER.ACCOUNT.NOT_FOUND})`,
                profileImage: `string`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            const user: any = await User.findOne({ _id: body.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);

            // check and remove exist file {
            if (!empty(user.profileImage) && user?.isProfileImageLocalStorage) MediaManager.Profile.remove(user?.profileImage);
            // } check and remove exist file

            // update user profile {
            const record: any = await User.findByIdAndUpdate(body.id, { isProfileImageLocalStorage: true, profileImage: body?.profileImage || null }, { new: true }).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.UPLOAD.FAIL);
            // } update user profile

            return res.status(200).send({ status: true, message: !empty(body?.profileImage) ? ADMIN_MSG.USER.UPLOAD.SUCCESS : ADMIN_MSG.USER.UPLOAD.UPLOAD_RESET, data: Format.profileUpload(record) });
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
                id: `required | objectId | exist: User._id (${ADMIN_MSG.USER.ACCOUNT.NOT_FOUND})`,
                rolePermissionId: `required | objectId | exist: RolePermission._id (${ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
                firstName: `required | shorttext`,
                lastName: `required | shorttext`,
                email: `required | email | lowercase | normalize: lower`,
                phoneCode: `required`,
                phone: `required | phone | normalize: string`,
                location: `required | object`
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);

            // get member permission {
            const memberRolePermission: any = await RolePermission.findById(req.body?.rolePermissionId).lean();
            if (empty(memberRolePermission)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);
            // } get member permission

            const body = sanitizeResult.body;

            // location {
            sanitizeResult = await sanitize(body?.location, {
                address1: `required | longtext`,
                // address2: `required | longtext`,
                city: `required | shorttext`,
                state: `required | shorttext`,
                country: `required | shorttext`,
                postcode: `required | shorttext`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.location = sanitizeResult.body;
            // } location
            // } sanitize data

            const existEmail: any = await User.findOne({ _id: { $ne: body.id }, email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(ADMIN_MSG.USER.ACCOUNT.EMAIL_EXIST);

            const user: any = await User.findOne({ _id: body.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);

            // get Lat Long {
            let locationData: any = await Core.Kit.getLatLong({
                address1: body?.location?.address1 || null,
                // address2: body?.location?.address2 || null,
                city: body?.location?.city || null,
                state: body?.location?.state || null,
                country: body?.location?.country || null,
                postcode: body?.location?.postcode || null,
            });
            if (locationData?.error) throw new Error(locationData?.error);
            // } get Lat Long

            // update record {
            const payload: any = {
                ...user,
                rolePermissionId: body?.rolePermissionId || null,
                firstName: body?.firstName || null,
                lastName: body?.lastName || null,
                email: body?.email || null,
                phoneCode: body?.phoneCode || null,
                phone: body?.phone || null,

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
            };

            const record: any = await User.findByIdAndUpdate(body.id, payload, { new: true }).lean();
            if (empty(record)) throw new Error(record?.error);
            // } update record

            // get user data {
            const updatedUser: any = await User.findById(record?._id).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(updatedUser)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } get user data

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.UPDATE.SUCCESS, data: Format.details(updatedUser, { departmentData, userStatusData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async status(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusKeys = userStatusMaster?.keys || [];
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                id: `required | objectId | exist: User._id (${ADMIN_MSG.USER.ACCOUNT.NOT_FOUND})`,
                status: `required | in: ${userStatusKeys}`
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);

            if (req.body?.status === 'REJECTED') {
                sanitizeResult = await sanitize(req?.body, {
                    reason: `required`
                });
                if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            }
            const body = sanitizeResult.body;
            // } sanitize data

            const user: any = await User.findOne({ _id: body.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);

            // update user status {
            const record: any = await User.findByIdAndUpdate(body.id, { status: body.status, reason: body?.reason }, { new: true }).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.STATUS.FAIL);
            // update user status

            if (user?.status !== record?.status) {
                let statusLabel = userStatusData[record.status]?.label || null;
                if (statusLabel) {
                    let cronPayload: any = [];

                    // notification send {
                    cronPayload.push({
                        userId: null,
                        actionBy: authUser?._id,

                        cronType: 'NOTIFICATION',
                        isAdminMail: false,
                        type: `USER-NOTIFICATION-STATUS-CHANGED`,

                        title: `Your account is ${statusLabel}`,
                        description: record?.reason || null,
                    });
                    // } notification send

                    // user mail send {
                    cronPayload.push({
                        userId: record?._id || null,
                        actionBy: authUser?._id,
                        cronType: 'MAIL',
                        isAdminMail: false,

                        type: `USER-MAIL-STATUS-CHANGED`,
                        title: `Your account is ${statusLabel}`,
                        description: record?.reason || null,
                    });
                    // user mail send

                    await CronJob.insertMany(cronPayload);
                }
            }

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.STATUS.SUCCESS, data: Format.status(record, { userStatusData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                id: `required | objectId | exist: User._id (${ADMIN_MSG.USER.ACCOUNT.NOT_FOUND})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            const user: any = await User.findOne({ _id: body.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);

            // delete user {
            const record: any = await User.findByIdAndUpdate(body.id, { deletedAt: new Date() }, { new: true }).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.DELETE.FAIL);
            // } delete user

            return res.status(200).send({ status: true, message: ADMIN_MSG.USER.DELETE.SUCCESS, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}