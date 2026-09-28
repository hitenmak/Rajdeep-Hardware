import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

// Models
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, formatDate, getNum, toObjectId, sanitize, paginateAggregate } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';

// Others
import { ADMIN_MSG } from '../../../common/messages';
import { ROOT_DIR } from '../../../config/Constant';
import MediaManager from '../../../services/media';
import Config from '../../../config';
import FolderConfig from '../../../services/media/config/FolderConfig';

//--------------------------------------------------------------

export default class Export {

    static async reportExport(req: any, res: any): Promise<void> {
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

            const exportData = await paginateAggregate(User, preQuery, postQuery, options);

            let records = Format.report(exportData.records, { departmentData, userStatusData });
            if (records?.error || empty(records)) throw new Error(ADMIN_MSG.REPORT.USER.DETAILS.NOT_FOUND);

            const fields = [
                { label: 'Wallet', value: 'wallet' },
                { label: 'Hold', value: 'hold' },

                { label: 'Role Permission', value: 'rolePermission' },

                { label: 'First Name', value: 'firstName' },
                { label: 'Last Name', value: 'lastName' },
                { label: 'Email', value: 'email' },
                { label: 'Phone', value: 'phone' },

                { label: 'Created By', value: 'createdBy' },
                { label: 'Status', value: 'status' },
                { label: 'Created At', value: 'createdAt' },
            ];

            const formatRow = (row: any) => ({
                wallet: getNum(row?.earning?.wallet || '0'),
                hold: getNum(row?.earning?.hold || '0'),

                rolePermission: row?.rolePermission?.name ? `${row?.rolePermission?.name} (${row?.rolePermission?.department?.label || ''})` : 'N/A',

                firstName: getStr(row?.firstName || 'N/A'),
                lastName: getStr(row?.lastName || 'N/A'),
                email: getStr(row?.email || 'N/A'),
                phone: row?.phone ? `${row?.phoneCode}${row.phone}`.trim() : 'N/A',

                createdBy: `${row?.createdBy?.firstName || ''} ${row?.createdBy?.lastName || ''}`.trim() || 'N/A',
                status: getStr(row?.status?.label || 'N/A'),
                createdAt: row?.createdAt ? formatDate(row.createdAt, 'YYYY-MM-DD') : 'N/A',
            });

            // generate {
            const formattedData = records.map(formatRow);
            const worksheet = xlsx.utils.json_to_sheet(formattedData, {
                header: fields.map(f => f.value),
            });
            xlsx.utils.sheet_add_aoa(worksheet, [fields.map(f => f.label)], { origin: 'A1' });
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Report');
            // } generate

            // folder path and make if not exist {
            const outputDir = path.resolve(ROOT_DIR, `../${Config.STORAGE.LOCAL_FOLDER}/${FolderConfig.OTHER_ATTACHMENT.FOLDER}`);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            // } folder path and make if not exist

            // file store {
            let fileName = `report.xlsx`;
            xlsx.writeFile(workbook, path.join(outputDir, fileName));
            // } file store

            const data = {
                fileName,
                url: MediaManager.OtherAttachment.get(fileName),
            };
            return res.status(200).send({ status: true, message: ADMIN_MSG.REPORT.EXPORT.SUCCESS, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}