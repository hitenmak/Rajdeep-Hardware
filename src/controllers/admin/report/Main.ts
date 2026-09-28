// Models
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, toObjectId, sanitize, paginateAggregate } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';

// Others
import { ADMIN_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class Main {

    static async report(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusKeys = userStatusMaster?.keys || [];
            const userStatusData = userStatusMaster?.dataOnKey || {};

            const departmentMaster = (await Core.Master.getDepartment()) || {};
            const departmentData = departmentMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                filters: 'required',
                page: 'required | number | min: 1',
                limit: 'required | number | min: 1',
                sort: `sortObject: rolePermissionName,firstName,lastName,email,phone,status,hold,wallet | normalize: sortObject`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            sanitizeResult = await sanitize(body?.filters, {
                rolePermissionId: `array`,
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

            if (!empty(rawFilters?.rolePermissionId) && rawFilters.rolePermissionId.length > 0) preQuery.rolePermissionId = { $in: rawFilters?.rolePermissionId.map((id: string) => toObjectId(id)) };
            if (!empty(rawFilters?.status) && rawFilters?.status?.length > 0) preQuery.status = { $in: rawFilters.status };

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
                    { path: 'rolePermissionId', model: 'rolePermissions' }
                ],
                collation: { locale: 'en', strength: 2 }
            };
            // } options

            if (body.sort) {
                if (!empty(body.sort.rolePermissionName)) body.sort = { 'rolePermissionId.name': body.sort.rolePermissionName };
                if (!empty(body.sort.hold)) body.sort = { 'earning.hold': body.sort.hold };
                if (!empty(body.sort.wallet)) body.sort = { 'earning.wallet': body.sort.wallet };

                options.sort = body.sort;
            }
            // } set filters

            const data = await paginateAggregate(User, preQuery, postQuery, options);

            data.records = Format.report(data.records, { departmentData, userStatusData });
            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}