import { Response, NextFunction } from 'express';

// Models
import { User } from '../models/user';
import { Setting } from '../models/setting';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../utils';
import MediaManager from '../services/media';

// Others
import { PANEL_AUTH } from '../config/Constant';
import Core from '../core';

//--------------------------------------------------------------

export default async (req: any, res: Response, next: NextFunction) => {
    try {
        if (empty(req.session?.panelUserId)) {
            req.setFlash?.('error', 'Please login to continue');
            return res.redirect('/panel/login');
        }

        // idle session expiration {
        const now = Date.now();
        const lastActivity = req.session.panelLastActivity || now;
        const idleLimitMs = PANEL_AUTH.IDLE_SESSION_TIMEOUT_IN_MINUTE * 60 * 1000;
        if ((now - lastActivity) > idleLimitMs) {
            return req.session.destroy(() => {
                res.redirect('/panel/login?expired=1');
            });
        }
        req.session.panelLastActivity = now;
        // } idle session expiration

        const record: any = await User.findById(req.session.panelUserId).populate([
            { path: 'rolePermissionId', model: 'rolePermissions' },
        ]).lean();

        if (empty(record) || !empty(record?.deletedAt) || record?.isActive === false) {
            return req.session.destroy(() => {
                res.redirect('/panel/login');
            });
        }

        req.panelUser = record;
        req.panelRolePermission = record?.rolePermissionId || {};

        const setting: any = await Setting.findOne({}).select('branding').lean();

        // expose to views {
        res.locals.authUser = record;
        res.locals.rolePermission = record?.rolePermissionId || {};
        res.locals.currentPath = (req.originalUrl || req.path || '').split('?')[0];
        res.locals.can = (keyPaths: string): boolean => {
            const permission = record?.rolePermissionId?.permission || {};
            if (permission?.isMaster) return true;
            return Core.RolePermission.hasPermission(permission?.modules, keyPaths);
        };
        res.locals.branding = {
            logoFull: !empty(setting?.branding?.logoFull) ? MediaManager.Setting.get(setting.branding.logoFull) : null,
            logoMark: !empty(setting?.branding?.logoMark) ? MediaManager.Setting.get(setting.branding.logoMark) : null,
        };
        // } expose to views

        next();
    } catch (e: any) {
        logError(e, '[MIDDLEWARE-PANEL-AUTH] -');
        return res.redirect('/panel/login');
    }
}
