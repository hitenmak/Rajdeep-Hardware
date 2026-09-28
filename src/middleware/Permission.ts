import { Response, NextFunction } from 'express';

// Models
import { RolePermission } from '../models/role-permission';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../utils';

//Others
import Core from '../core';
import { ADMIN_MSG } from '../common/messages';

//--------------------------------------------------------------

const permissionAuth = (keyPaths: string) => async (req: any, res: Response, next: NextFunction) => {
	try {
		if (!empty(req?.authUser?.rolePermissionId?._id)) {

			const record = await RolePermission.findOne({ _id: req.authUser?.rolePermissionId?._id }).lean();
			if (empty(record)) throw new Error(ADMIN_MSG.ROLE_PERMISSION.DETAILS.NOT_FOUND);

			// keyPaths: value x then allow only to masters admin
			if (record?.permission?.isMaster) return next();

			// const isPermitted = Core.RolePermission.hasPermission(record?.permission?.modules, keyPaths);

			// get only assign permission {
			let isOnlyAssignPermission = false; // its work with only one ONLY-ASSIGN key in keyPaths
			const keyPathsList = (keyPaths.split(',') || []).map(item => item.trim());
			for (const key of keyPathsList) {
				// onlyAssignKey
				const onlyAssignKey = (key.split('.')?.[1] || '');
				if (onlyAssignKey === 'ONLY-ASSIGN') {
					isOnlyAssignPermission = Core.RolePermission.hasPermission(record?.permission?.modules, key);
					break;
				}
			}
			// } get only assign permission

			// req.contextPermission = {
			// 	isOnlyAssign: isOnlyAssignPermission,
			// };

			// check others permission {
			const keyPathsListFiltered = keyPathsList.filter(item => !item.includes('.ONLY-ASSIGN'));
			const isPermitted = Core.RolePermission.hasPermission(record?.permission?.modules, keyPathsListFiltered.join(', '));
			if (isPermitted) return next();
			// } check others permission
		}

		return res.status(403).send({ status: false, message: ADMIN_MSG.ROLE_PERMISSION.DETAILS.DENIED, data: {} });
	} catch (e: any) {
		return res.send({ status: false, message: e?.log?.error || '', data: {} });
	}
};

export default permissionAuth;