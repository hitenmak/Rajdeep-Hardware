import moment from 'moment';

// Models
import { User } from '../../../models/user';
import { RolePermission } from '../../../models/role-permission';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, toObjectId } from '../../../utils';
import Token from '../../../services/token';
import MediaManager from '../../../services/media';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

const buildQuery = async (req: any): Promise<any> => {
    const query: any = { deletedAt: null, 'rolePermissionId': { $ne: null } };

    const masterRoles = await RolePermission.find({ 'permission.isMaster': true }).select('_id').lean();
    const masterRoleIds = masterRoles.map((r: any) => r._id);
    if (masterRoleIds.length) query.rolePermissionId = { $nin: masterRoleIds };

    if (!empty(req.query?.role)) query.rolePermissionId = toObjectId(req.query.role);
    if (!empty(req.query?.status)) query.isActive = req.query.status === 'ACTIVE';

    if (!empty(req.query?.search)) {
        const regx = { $regex: new RegExp(req.query.search, 'i') };
        query.$or = [{ firstName: regx }, { lastName: regx }, { email: regx }, { phone: regx }];
    }

    if (req.query?.createdFrom || req.query?.createdTo) {
        query.createdAt = {};
        if (req.query.createdFrom) query.createdAt.$gte = moment(req.query.createdFrom, 'YYYY-MM-DD').startOf('day').toDate();
        if (req.query.createdTo) query.createdAt.$lte = moment(req.query.createdTo, 'YYYY-MM-DD').endOf('day').toDate();
    }

    return query;
}

export default class UserController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query = await buildQuery(req);

            const result: any = await User.paginate(query, {
                page, limit,
                sort: { createdAt: -1 },
                populate: [{ path: 'rolePermissionId', model: 'rolePermissions' }],
                lean: true,
            });

            const roles = await RolePermission.find({ 'permission.isMaster': false }).select('_id name').lean();

            return res.render('panel/user/list', {
                title: 'Users',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                roles,
                filters: req.query || {},
            });
        } catch (e: any) {
            logError(e, '[PANEL-USER-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async createPage(req: any, res: any): Promise<void> {
        const roles = await RolePermission.find({ 'permission.isMaster': false }).select('_id name').lean();
        return res.render('panel/user/form', {
            title: 'Add User',
            layout: 'panel/layout/main',
            roles,
            record: null,
        });
    }

    static async create(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                rolePermissionId: `required | objectId | exist: RolePermission._id (${PANEL_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
                firstName: `required | shorttext`,
                lastName: `required | shorttext`,
                email: `required | email | lowercase | normalize: lower`,
                phoneCode: `required`,
                phone: `required | normalize: string`,
                password: `required | password`,
                isActive: `boolean | normalize: boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const existEmail: any = await User.findOne({ email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(PANEL_MSG.USER.ACCOUNT.EMAIL_EXIST);

            const password = Token.Password.encryptPassword(body.password);

            await User.create({
                createdBy: req.panelUser?._id,
                rolePermissionId: body.rolePermissionId,
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                phoneCode: body.phoneCode,
                phone: body.phone,
                password,
                isEmailVerified: true,
                isActive: body.isActive !== false,
                status: 'APPROVED',
            });

            req.setFlash?.('success', PANEL_MSG.USER.ACCOUNT.CREATE_SUCCESS);
            return res.redirect('/panel/users');
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/users/create');
        }
    }

    static async viewPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await User.findOne({ _id: req.params.id, deletedAt: null }).populate([
                { path: 'rolePermissionId', model: 'rolePermissions' },
                { path: 'createdBy', model: 'users' },
            ]).lean();
            if (empty(record)) throw new Error(PANEL_MSG.USER.ACCOUNT.NOT_FOUND);

            return res.render('panel/user/view', { title: 'User Details', layout: 'panel/layout/main', record });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/users');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await User.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.USER.ACCOUNT.NOT_FOUND);

            const roles = await RolePermission.find({ 'permission.isMaster': false }).select('_id name').lean();

            return res.render('panel/user/form', { title: 'Edit User', layout: 'panel/layout/main', roles, record });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/users');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                rolePermissionId: `required | objectId | exist: RolePermission._id (${PANEL_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND})`,
                firstName: `required | shorttext`,
                lastName: `required | shorttext`,
                email: `required | email | lowercase | normalize: lower`,
                phoneCode: `required`,
                phone: `required | normalize: string`,
                password: `password`,
                isActive: `boolean | normalize: boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const user: any = await User.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(PANEL_MSG.USER.ACCOUNT.NOT_FOUND);

            const existEmail: any = await User.findOne({ _id: { $ne: req.params.id }, email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(PANEL_MSG.USER.ACCOUNT.EMAIL_EXIST);

            const payload: any = {
                rolePermissionId: body.rolePermissionId,
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                phoneCode: body.phoneCode,
                phone: body.phone,
                isActive: body.isActive !== false,
            };
            if (!empty(body.password)) payload.password = Token.Password.encryptPassword(body.password);

            await User.findByIdAndUpdate(req.params.id, payload);

            req.setFlash?.('success', PANEL_MSG.USER.UPDATE.SUCCESS);
            return res.redirect('/panel/users');
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect(`/panel/users/${req.params.id}/edit`);
        }
    }

    static async toggleActive(req: any, res: any): Promise<void> {
        try {
            if (req.params.id === req.panelUser?._id?.toString()) throw new Error(PANEL_MSG.USER.ACCOUNT.SELF_ACTION_NOT_ALLOWED);

            const user: any = await User.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(PANEL_MSG.USER.ACCOUNT.NOT_FOUND);

            await User.findByIdAndUpdate(req.params.id, { isActive: !user.isActive });

            req.setFlash?.('success', PANEL_MSG.USER.STATUS.SUCCESS);
            return res.redirect('/panel/users');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.USER.STATUS.FAIL);
            return res.redirect('/panel/users');
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            if (req.params.id === req.panelUser?._id?.toString()) throw new Error(PANEL_MSG.USER.ACCOUNT.SELF_ACTION_NOT_ALLOWED);

            const user: any = await User.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(user)) throw new Error(PANEL_MSG.USER.ACCOUNT.NOT_FOUND);

            await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

            req.setFlash?.('success', PANEL_MSG.USER.DELETE.SUCCESS);
            return res.redirect('/panel/users');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.USER.DELETE.FAIL);
            return res.redirect('/panel/users');
        }
    }

}
