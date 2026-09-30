// Models
import { PurchaseOrder } from '../../../models/purchase-order';
import { PurchaseOrderAssignment } from '../../../models/purchase-order-assignment';
import { PurchaseOrderStatusHistory } from '../../../models/purchase-order-status-history';
import { DeliveryImage } from '../../../models/delivery-image';
import { Dealer } from '../../../models/dealer';
import { Product } from '../../../models/product';
import { User } from '../../../models/user';
import { RolePermission } from '../../../models/role-permission';
import { Setting } from '../../../models/setting';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getNum, getStr } from '../../../utils';
import MediaManager from '../../../services/media';
import Core from '../../../core';
import * as Helper from './helper';

// Others
import { PANEL_MSG } from '../../../common/messages';
import { SEQUENCE } from '../../../core/Sequence';

//--------------------------------------------------------------

// current user's department (ACCOUNT_MANAGER / PACKAGE_MANAGER / DELIVERY_MANAGER / ADMIN / null) {
const getDepartment = (req: any): string | null => req.panelRolePermission?.department || null;
const isMaster = (req: any): boolean => !!req.panelRolePermission?.permission?.isMaster;
// } current user's department

// Package/Delivery Manager may only ever see or act on a PO assigned to them; everyone
// else (Admin, Account Manager, or any custom role with PURCHASE-ORDER.VIEW) sees all {
const applyAssignmentScope = (req: any, query: any): any => {
    if (isMaster(req)) return query;
    const department = getDepartment(req);
    if (department === 'PACKAGE_MANAGER') query.assignedPackageManagerId = req.panelUser?._id;
    else if (department === 'DELIVERY_MANAGER') query.assignedDeliveryManagerId = req.panelUser?._id;
    return query;
}

const assertAssignmentAccess = (req: any, record: any): void => {
    if (isMaster(req)) return;
    const department = getDepartment(req);
    if (department === 'PACKAGE_MANAGER' && getStr(record.assignedPackageManagerId) !== getStr(req.panelUser?._id)) {
        throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.DENIED);
    }
    if (department === 'DELIVERY_MANAGER' && getStr(record.assignedDeliveryManagerId) !== getStr(req.panelUser?._id)) {
        throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.DENIED);
    }
}
// } assignment scope guards

// active users belonging to a given department (used to populate the assignment dropdowns) {
const getUsersByDepartment = async (department: string): Promise<any[]> => {
    const roles = await RolePermission.find({ department }).select('_id').lean();
    if (!roles.length) return [];
    return await User.find({ rolePermissionId: { $in: roles.map((r: any) => r._id) }, isActive: true, deletedAt: null }).select('_id firstName lastName email').sort({ firstName: 1 }).lean();
}
// } active users belonging to a given department

const POPULATE = [
    { path: 'dealerId', model: 'dealers' },
    { path: 'assignedPackageManagerId', model: 'users' },
    { path: 'assignedDeliveryManagerId', model: 'users' },
];

const PURCHASE_ORDER_TRACKED_FIELDS = [
    { key: 'dealerId', label: 'Dealer' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'discount', label: 'Discount' },
    { key: 'tax', label: 'Tax' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'status', label: 'Status' },
];

export default class PurchaseOrderController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            let query: any = { deletedAt: null };
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.dealerId)) query.dealerId = req.query.dealerId;
            if (!empty(req.query?.search)) query.poNumber = { $regex: new RegExp(req.query.search, 'i') };
            query = applyAssignmentScope(req, query);

            const result: any = await PurchaseOrder.paginate(query, { page, limit, sort: { createdAt: -1 }, populate: POPULATE, lean: true });

            const dealers = await Dealer.find({ deletedAt: null }).select('_id businessName dealerCode').sort({ businessName: 1 }).lean();

            return res.render('panel/purchase-order/list', {
                title: 'Purchase Orders',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
                dealers,
                statuses: Helper.STATUSES,
            });
        } catch (e: any) {
            logError(e, '[PANEL-PURCHASE-ORDER-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async createPage(req: any, res: any): Promise<void> {
        try {
            const dealers = await Dealer.find({ deletedAt: null, approvalStatus: 'APPROVED', status: 'ACTIVE' }).select('_id businessName dealerCode').sort({ businessName: 1 }).lean();
            const products = await Product.find({ deletedAt: null }).select('_id name baseSku pricing').sort({ name: 1 }).limit(1000).lean();

            return res.render('panel/purchase-order/form', {
                title: 'Add Purchase Order',
                layout: 'panel/layout/main',
                record: null,
                dealers,
                products,
            });
        } catch (e: any) {
            logError(e, '[PANEL-PURCHASE-ORDER-CREATE-PAGE] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/purchase-orders');
        }
    }

    static async create(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const dealer: any = await Dealer.findOne({ _id: req.body?.dealerId, deletedAt: null }).lean();
            if (empty(dealer)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const items = Helper.parseItems(req.body?.items);
            if (!items.length) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NO_ITEMS);

            const settings: any = await Setting.findOne({}).select('purchaseOrder').lean();
            if (settings?.purchaseOrder?.requiredRemarks && empty(req.body?.remarks)) throw new Error('Remarks are required for every purchase order (see Settings > Purchase Orders).');

            const shipping = getNum(req.body?.shipping, 0);
            const totals = Helper.computeTotals(items, shipping);

            const sequence = await Core.Sequence.next(SEQUENCE.PURCHASE_ORDER, () => PurchaseOrder.countDocuments({}));
            const poNumber = Helper.generatePoNumber(sequence, settings?.purchaseOrder?.poPrefix, settings?.purchaseOrder?.poNumberFormat);

            const record: any = await PurchaseOrder.create({
                poNumber,
                dealerId: dealer._id,
                orderDate: new Date(),
                items,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                shipping,
                totalAmount: totals.totalAmount,
                remarks: req.body?.remarks || null,
                status: 'PENDING',
                createdBy: panelUser?._id,
                updatedBy: panelUser?._id,
            });

            await PurchaseOrderStatusHistory.create({ purchaseOrderId: record._id, oldStatus: null, newStatus: 'PENDING', remarks: 'Purchase order created', changedBy: panelUser?._id });

            await Core.ActivityLog.log({
                req, module: 'PURCHASE-ORDER', entityId: record._id, entityLabel: record.poNumber, action: 'CREATE',
                changes: Core.ActivityLog.diff({}, record, PURCHASE_ORDER_TRACKED_FIELDS),
                summary: `Purchase order "${record.poNumber}" created for ${dealer.businessName}`,
            });

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.CREATE.SUCCESS);
            return res.redirect(`/panel/purchase-orders/${record._id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.CREATE.FAIL);
            return res.redirect('/panel/purchase-orders/create');
        }
    }

    static async viewPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).populate(POPULATE).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            assertAssignmentAccess(req, record);

            const statusHistory = await PurchaseOrderStatusHistory.find({ purchaseOrderId: req.params.id }).sort({ createdAt: -1 }).populate([{ path: 'changedBy', model: 'users' }]).lean();
            const assignmentHistory = await PurchaseOrderAssignment.find({ purchaseOrderId: req.params.id }).sort({ createdAt: -1 }).populate([{ path: 'userId', model: 'users' }, { path: 'assignedBy', model: 'users' }]).lean();
            const deliveryImages = await DeliveryImage.find({ purchaseOrderId: req.params.id }).sort({ createdAt: -1 }).populate([{ path: 'uploadedBy', model: 'users' }]).lean();

            const packageManagers = await getUsersByDepartment('PACKAGE_MANAGER');
            const deliveryManagers = await getUsersByDepartment('DELIVERY_MANAGER');

            return res.render('panel/purchase-order/view', {
                title: `Purchase Order ${record.poNumber}`,
                layout: 'panel/layout/main',
                record,
                statusHistory,
                assignmentHistory,
                deliveryImages: deliveryImages.map((d: any) => ({ ...d, url: MediaManager.DeliveryImage.get(d.image) })),
                packageManagers,
                deliveryManagers,
                department: getDepartment(req),
                isMaster: isMaster(req),
                transitions: Helper.STATUS_TRANSITIONS[record.status] || {},
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/purchase-orders');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).populate(POPULATE).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            if (record.status !== 'PENDING') throw new Error(`Only a pending purchase order can be edited.`);

            const dealers = await Dealer.find({ deletedAt: null, approvalStatus: 'APPROVED', status: 'ACTIVE' }).select('_id businessName dealerCode').sort({ businessName: 1 }).lean();
            const products = await Product.find({ deletedAt: null }).select('_id name baseSku pricing').sort({ name: 1 }).limit(1000).lean();

            return res.render('panel/purchase-order/form', {
                title: `Edit Purchase Order ${record.poNumber}`,
                layout: 'panel/layout/main',
                record,
                dealers,
                products,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            if (record.status !== 'PENDING') throw new Error(`Only a pending purchase order can be edited.`);

            const dealer: any = await Dealer.findOne({ _id: req.body?.dealerId, deletedAt: null }).lean();
            if (empty(dealer)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const items = Helper.parseItems(req.body?.items);
            if (!items.length) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NO_ITEMS);

            const shipping = getNum(req.body?.shipping, 0);
            const totals = Helper.computeTotals(items, shipping);

            const newValues = {
                dealerId: dealer._id,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                shipping,
                totalAmount: totals.totalAmount,
                remarks: req.body?.remarks || null,
            };

            await PurchaseOrder.findByIdAndUpdate(req.params.id, {
                ...newValues,
                items,
                updatedBy: panelUser?._id,
            });

            const changes = Core.ActivityLog.diff(record, newValues, PURCHASE_ORDER_TRACKED_FIELDS);
            await Core.ActivityLog.log({
                req, module: 'PURCHASE-ORDER', entityId: req.params.id, entityLabel: record.poNumber, action: 'UPDATE',
                changes, summary: changes.length ? undefined : `Purchase order "${record.poNumber}" updated (no tracked fields changed)`,
            });

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.UPDATE.SUCCESS);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.UPDATE.FAIL);
            return res.redirect(`/panel/purchase-orders/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            if (record.status !== 'PENDING') throw new Error(PANEL_MSG.PURCHASE_ORDER.DELETE.NOT_ALLOWED);

            await PurchaseOrder.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

            await Core.ActivityLog.log({
                req, module: 'PURCHASE-ORDER', entityId: record._id, entityLabel: record.poNumber, action: 'DELETE',
                summary: `Purchase order "${record.poNumber}" deleted`,
            });

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.DELETE.SUCCESS);
            return res.redirect('/panel/purchase-orders');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.DELETE.FAIL);
            return res.redirect('/panel/purchase-orders');
        }
    }

    // Account Manager reviews a pending order: approve/reject/partially approve, per item {
    static async review(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            if (!isMaster(req) && getDepartment(req) !== 'ACCOUNT_MANAGER') throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.DENIED);

            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            if (!['PENDING', 'UNDER_REVIEW'].includes(record.status)) throw new Error(`This purchase order has already been reviewed.`);

            const { items, overallStatus } = Helper.applyReviewDecision(record.items || [], req.body?.decisions);

            await PurchaseOrder.findByIdAndUpdate(req.params.id, { items, status: overallStatus, updatedBy: panelUser?._id });
            await PurchaseOrderStatusHistory.create({
                purchaseOrderId: req.params.id,
                oldStatus: record.status,
                newStatus: overallStatus,
                remarks: req.body?.remarks || null,
                changedBy: panelUser?._id,
            });

            await Core.ActivityLog.log({
                req, module: 'PURCHASE-ORDER', entityId: req.params.id, entityLabel: record.poNumber, action: 'STATUS_CHANGE',
                changes: [{ field: 'status', label: 'Status', oldValue: record.status, newValue: overallStatus }],
                summary: `Purchase order "${record.poNumber}" reviewed: ${record.status} → ${overallStatus}`,
            });

            if (overallStatus !== record.status) await Core.DealerNotification.orderStatusChanged(record, overallStatus);

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.REVIEW.SUCCESS);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.REVIEW.FAIL);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        }
    }
    // } review

    // moves the PO forward through the status workflow, enforcing the transition table + assignment {
    static async changeStatus(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const status = req.body?.status;
            if (!Helper.STATUSES.includes(status)) throw new Error(PANEL_MSG.COMMON.DATA.INVALID);

            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            assertAssignmentAccess(req, record);

            if (!isMaster(req) && !Helper.canChangeStatus(record.status, status, getDepartment(req))) {
                throw new Error(PANEL_MSG.PURCHASE_ORDER.STATUS.INVALID_TRANSITION);
            }

            if (status === 'DELIVERED') {
                const hasDeliveryImage = await DeliveryImage.findOne({ purchaseOrderId: req.params.id }).lean();
                if (empty(hasDeliveryImage)) throw new Error(PANEL_MSG.PURCHASE_ORDER.STATUS.DELIVERY_IMAGE_REQUIRED);
            }

            await PurchaseOrder.findByIdAndUpdate(req.params.id, { status, updatedBy: panelUser?._id });
            await PurchaseOrderStatusHistory.create({
                purchaseOrderId: req.params.id,
                oldStatus: record.status,
                newStatus: status,
                remarks: req.body?.remarks || null,
                changedBy: panelUser?._id,
            });

            await Core.ActivityLog.log({
                req, module: 'PURCHASE-ORDER', entityId: req.params.id, entityLabel: record.poNumber, action: 'STATUS_CHANGE',
                changes: [{ field: 'status', label: 'Status', oldValue: record.status, newValue: status }],
            });

            if (status !== record.status) await Core.DealerNotification.orderStatusChanged(record, status);

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.STATUS.SUCCESS);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.STATUS.FAIL);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        }
    }
    // } changeStatus

    // assignment {
    static async assignPackageManager(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(record.status)) throw new Error(PANEL_MSG.PURCHASE_ORDER.ASSIGNMENT.NOT_APPROVED);

            const userId = req.body?.userId;
            if (empty(userId)) throw new Error(PANEL_MSG.COMMON.DATA.INVALID);

            if (record.assignedPackageManagerId) {
                await PurchaseOrderAssignment.updateMany(
                    { purchaseOrderId: req.params.id, assignmentType: 'PACKAGE_MANAGER', status: 'ACTIVE' },
                    { status: 'INACTIVE', unassignedAt: new Date() },
                );
            }

            await PurchaseOrderAssignment.create({ purchaseOrderId: req.params.id, userId, assignmentType: 'PACKAGE_MANAGER', assignedBy: panelUser?._id, assignedAt: new Date(), status: 'ACTIVE' });
            await PurchaseOrder.findByIdAndUpdate(req.params.id, { assignedPackageManagerId: userId, updatedBy: panelUser?._id });

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.ASSIGNMENT.PACKAGE_MANAGER_SUCCESS);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.ASSIGNMENT.FAIL);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        }
    }

    static async assignDeliveryManager(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            assertAssignmentAccess(req, record);

            const userId = req.body?.userId;
            if (empty(userId)) throw new Error(PANEL_MSG.COMMON.DATA.INVALID);

            if (record.assignedDeliveryManagerId) {
                await PurchaseOrderAssignment.updateMany(
                    { purchaseOrderId: req.params.id, assignmentType: 'DELIVERY_MANAGER', status: 'ACTIVE' },
                    { status: 'INACTIVE', unassignedAt: new Date() },
                );
            }

            await PurchaseOrderAssignment.create({ purchaseOrderId: req.params.id, userId, assignmentType: 'DELIVERY_MANAGER', assignedBy: panelUser?._id, assignedAt: new Date(), status: 'ACTIVE' });
            await PurchaseOrder.findByIdAndUpdate(req.params.id, { assignedDeliveryManagerId: userId, updatedBy: panelUser?._id });

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.ASSIGNMENT.DELIVERY_MANAGER_SUCCESS);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.ASSIGNMENT.FAIL);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        }
    }
    // } assignment

    // delivery images (Delivery Manager only, and only for the PO assigned to them) {
    static async uploadDeliveryImage(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await PurchaseOrder.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            assertAssignmentAccess(req, record);

            const file: any = await MediaManager.DeliveryImage.set({ image: '' }, req, res);
            if (file?.error) throw new Error(file.error);
            if (empty(file?.image)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DELIVERY_IMAGE.FAIL);

            await DeliveryImage.create({ purchaseOrderId: req.params.id, uploadedBy: panelUser?._id, image: file.image, remarks: req.body?.remarks || null });

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.DELIVERY_IMAGE.UPLOAD_SUCCESS);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.DELIVERY_IMAGE.FAIL);
            return res.redirect(`/panel/purchase-orders/${req.params.id}`);
        }
    }

    static async deleteDeliveryImage(req: any, res: any): Promise<void> {
        const { id, imageId } = req.params;

        try {
            const record: any = await PurchaseOrder.findOne({ _id: id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PURCHASE_ORDER.DETAILS.NOT_FOUND);
            assertAssignmentAccess(req, record);

            const image: any = await DeliveryImage.findOne({ _id: imageId, purchaseOrderId: id }).lean();
            if (empty(image)) throw new Error(PANEL_MSG.COMMON.DATA.NOT_FOUND);

            if (!empty(image.image)) MediaManager.DeliveryImage.remove(image.image);
            await DeliveryImage.findByIdAndDelete(imageId);

            req.setFlash?.('success', PANEL_MSG.PURCHASE_ORDER.DELIVERY_IMAGE.DELETE_SUCCESS);
            return res.redirect(`/panel/purchase-orders/${id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PURCHASE_ORDER.DELIVERY_IMAGE.FAIL);
            return res.redirect(`/panel/purchase-orders/${id}`);
        }
    }
    // } delivery images

}
