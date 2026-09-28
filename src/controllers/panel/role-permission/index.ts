// Models
import { RolePermission } from '../../../models/role-permission';
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getBool, getNum } from '../../../utils';
import Core from '../../../core';

// Others
import { PANEL_MSG } from '../../../common/messages';
import * as DataHandler from '../../../data';

//--------------------------------------------------------------

export default class RolePermissionController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { 'permission.isMaster': false };
            if (!empty(req.query?.search)) query.name = { $regex: new RegExp(req.query.search, 'i') };

            const result: any = await RolePermission.paginate(query, { page, limit, sort: { createdAt: -1 }, lean: true });

            return res.render('panel/role-permission/list', {
                title: 'Roles & Permissions',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
            });
        } catch (e: any) {
            logError(e, '[PANEL-ROLE-PERMISSION-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async createPage(req: any, res: any): Promise<void> {
        const modules: any = Core.RolePermission.getPermission({});

        return res.render('panel/role-permission/form', {
            title: 'Add Role',
            layout: 'panel/layout/main',
            departments: DataHandler.Department.filter((d: any) => d.key !== 'ADMIN'),
            permissionConfig: modules.permissionConfig,
            record: null,
        });
    }

    static async create(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                name: `required | shorttext`,
                department: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const existDepartment: any = await RolePermission.findOne({ department: body.department }).lean();
            if (!empty(existDepartment)) throw new Error(PANEL_MSG.ROLE_PERMISSION.UPDATE.DEPARTMENT_EXIST);

            const permission: any = Core.RolePermission.getPermission(req.body?.modules || {}, false);

            await RolePermission.create({
                name: body.name,
                department: body.department,
                permission: { isMaster: false, modules: permission.permissionPayload },
            });

            req.setFlash?.('success', PANEL_MSG.ROLE_PERMISSION.UPDATE.SUCCESS);
            return res.redirect('/panel/roles');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ROLE_PERMISSION.UPDATE.FAIL);
            return res.redirect('/panel/roles/create');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await RolePermission.findOne({ _id: req.params.id, 'permission.isMaster': false }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);

            const modules: any = Core.RolePermission.getPermission(record?.permission?.modules, false);

            return res.render('panel/role-permission/form', {
                title: 'Edit Role',
                layout: 'panel/layout/main',
                departments: DataHandler.Department.filter((d: any) => d.key !== 'ADMIN'),
                permissionConfig: modules.permissionConfig,
                record,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/roles');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                name: `required | shorttext`,
                department: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const record: any = await RolePermission.findOne({ _id: req.params.id, 'permission.isMaster': false }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);

            const existDepartment: any = await RolePermission.findOne({ _id: { $ne: req.params.id }, department: body.department }).lean();
            if (!empty(existDepartment)) throw new Error(PANEL_MSG.ROLE_PERMISSION.UPDATE.DEPARTMENT_EXIST);

            const permission: any = Core.RolePermission.getPermission(req.body?.modules || {}, false);

            await RolePermission.findByIdAndUpdate(req.params.id, {
                name: body.name,
                department: body.department,
                permission: { isMaster: false, modules: permission.permissionPayload },
            });

            req.setFlash?.('success', PANEL_MSG.ROLE_PERMISSION.UPDATE.SUCCESS);
            return res.redirect('/panel/roles');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ROLE_PERMISSION.UPDATE.FAIL);
            return res.redirect(`/panel/roles/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await RolePermission.findOne({ _id: req.params.id }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);
            if (record?.permission?.isMaster) throw new Error(PANEL_MSG.ROLE_PERMISSION.DELETE.MASTER_NOT_ALLOWED);

            const assignedUser: any = await User.findOne({ rolePermissionId: req.params.id, deletedAt: null }).lean();
            if (!empty(assignedUser)) throw new Error(PANEL_MSG.ROLE_PERMISSION.DELETE.NOT_ALLOWED);

            await RolePermission.findByIdAndDelete(req.params.id);

            req.setFlash?.('success', PANEL_MSG.ROLE_PERMISSION.DELETE.SUCCESS);
            return res.redirect('/panel/roles');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ROLE_PERMISSION.DELETE.FAIL);
            return res.redirect('/panel/roles');
        }
    }

}
