import { Response, NextFunction } from 'express';

// Helpers
import { empty } from '../utils';

// Others
import Core from '../core';

//--------------------------------------------------------------

const panelPermission = (keyPaths: string) => (req: any, res: Response, next: NextFunction) => {
    try {
        const permission = req.panelRolePermission?.permission || {};

        if (permission?.isMaster) return next();
        if (Core.RolePermission.hasPermission(permission?.modules, keyPaths)) return next();

        return res.status(403).render('panel/error/403', {
            title: 'Access Denied',
            layout: 'panel/layout/main',
        });
    } catch (e: any) {
        return res.status(403).render('panel/error/403', {
            title: 'Access Denied',
            layout: 'panel/layout/main',
        });
    }
};

export default panelPermission;
