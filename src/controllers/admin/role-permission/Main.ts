// Models
import { User } from '../../../models/user';
import { RolePermission } from '../../../models/role-permission';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, lower, sanitize, getBool, paginateAggregate, upsertOne } from '../../../utils';
import { Format } from './helper';

// Others
import { ADMIN_MSG } from '../../../common/messages';
import Core from '../../../core';

//--------------------------------------------------------------

export default class Main {

    static async config(req: any, res: any): Promise<void> {
        try {
            const modules: any = Core.RolePermission.getPermission({});

            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data: { permission: modules.permissionConfig } });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async list(req: any, res: any): Promise<void> {
        try {
            // get config {
            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentKeys = departmentMaster?.keys || [];
            const departmentData = departmentMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                filters: 'required',
                page: 'required | number | min: 1',
                limit: 'required | number | min: 1',
                sort: `sortObject: name,createdAt | normalize: sortObject`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            sanitizeResult = await sanitize(body?.filters, {
                department: `array | arrayin: ${departmentKeys}`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.filters = sanitizeResult.body;
            // } sanitize data

            // set filters {
            const rawFilters = body.filters || {};

            // pre query {
            const preQuery: any = { 'permission.isMaster': false };
            if (!empty(rawFilters.department) && rawFilters.department.length > 0) preQuery.department = { $in: rawFilters.department };
            // } pre query

            // post query {
            let postQuery: any[] = [];
            if (rawFilters.search) {
                const regx = { $regex: new RegExp(rawFilters.search, 'i') };
                postQuery.push(
                    { name: regx },
                );
            }
            // } post query
            // } pre query

            // options {
            const options: any = {
                page: body.page,
                limit: body.limit,
            };
            if (body.sort) options.sort = body.sort;
            // } options
            // } set filters

            const data = await paginateAggregate(RolePermission, preQuery, postQuery, options);

            data.records = Format.list(data.records, { departmentData });
            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async details(req: any, res: any): Promise<void> {
        try {
            // get config {
            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentData = departmentMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                id: `required | objectId | exist: RolePermission._id (${ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const { id: rolePermission } = sanitizeResult.records;
            // } sanitize data

            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data: Format.details(rolePermission, { departmentData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async set(req: any, res: any): Promise<void> {
        try {
            // get config {
            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentKeys = departmentMaster?.keys || [];
            const departmentData = departmentMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                id: `objectId | exist: RolePermission._id (${ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
                name: `required`,
                department: `required | in: ${departmentKeys}`,
                permission: `required`
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // check department exist or not {
            let departmentCheckQuery: any = { department: body.department };
            if (!empty(body?.id)) departmentCheckQuery._id = { $ne: body.id };
            const existDepartment: any = await RolePermission.findOne(departmentCheckQuery).lean();
            if (!empty(existDepartment)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.UPDATE.DEPARTMENT_EXIST);
            // } check department exist or not

            // create or update role permission {
            const query: any = {};
            if (body.id) query._id = body.id;

            const permission: any = Core.RolePermission.getPermission(body.permission.modules, getBool(body.permission.isMaster));

            const record: any = await upsertOne(RolePermission, query, {
                ...body,
                department: body?.department || null,
                permission: {
                    ...body.permission,
                    modules: permission?.permissionPayload,
                    isMaster: false
                }
            });
            if (empty(record)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.UPDATE.FAIL);
            // } create or update role permission

            return res.status(200).send({ status: true, message: ADMIN_MSG.ROLE_PERMISSION.UPDATE.SUCCESS, data: Format.details(record, { departmentData }) });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                id: `required | objectId | exist: RolePermission._id (${ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // const { id: rolePermission } = sanitizeResult.records;
            // } sanitize data

            // check assigned role or not {
            const checkExistUser: any = await User.findOne({ rolePermissionId: body.id }).lean();
            if (empty(checkExistUser)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DELETE.DELETE_NOT_ALLOWED);
            // } check assigned role or not

            // delete permission {
            const record: any = await RolePermission.findByIdAndDelete(body?.id);
            if (empty(record)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DELETE.FAIL);
            // } delete permission

            // blank set role permission id {
            const updatedUser: any = await User.updateMany({ rolePermissionId: body.id }, { rolePermissionId: null });
            if (empty(updatedUser)) throw new Error(updatedUser?.error);
            // } blank set role permission id

            return res.status(200).send({ status: true, message: ADMIN_MSG.ROLE_PERMISSION.DELETE.SUCCESS, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}