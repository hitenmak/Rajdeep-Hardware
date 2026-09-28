// Models
import { Dealer } from '../../../models/dealer';
import { DealerPricing } from '../../../models/dealer-pricing';
import { DealerDiscount } from '../../../models/dealer-discount';
import { ActivityLog } from '../../../models/activity-log';
import { Category } from '../../../models/category';
import { Product } from '../../../models/product';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, getStr, formatKey } from '../../../utils';
import Core from '../../../core';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

const DEALER_TRACKED_FIELDS = [
    { key: 'businessName', label: 'Business Name' },
    { key: 'contactName', label: 'Contact Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'defaultDiscount', label: 'Default Discount' },
];

export default class DealerController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { deletedAt: null };
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.approvalStatus)) query.approvalStatus = req.query.approvalStatus;
            if (!empty(req.query?.city)) query.city = { $regex: new RegExp(req.query.city, 'i') };
            if (!empty(req.query?.search)) {
                const regx = { $regex: new RegExp(req.query.search, 'i') };
                query.$or = [{ businessName: regx }, { dealerCode: regx }, { contactName: regx }, { email: regx }];
            }

            const result: any = await Dealer.paginate(query, { page, limit, sort: { createdAt: -1 }, lean: true });

            return res.render('panel/dealer/list', {
                title: 'Dealers',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
            });
        } catch (e: any) {
            logError(e, '[PANEL-DEALER-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static createPage(req: any, res: any): void {
        return res.render('panel/dealer/form', { title: 'Add Dealer', layout: 'panel/layout/main', record: null });
    }

    static async create(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const sanitizeResult = await sanitize(req?.body, {
                dealerCode: `required | shorttext`,
                businessName: `required | shorttext`,
                contactName: `shorttext`,
                email: `required | email`,
                phoneCode: `shorttext`,
                phone: `shorttext`,
                address: `longtext`,
                city: `shorttext`,
                state: `shorttext`,
                country: `shorttext`,
                taxNumber: `shorttext`,
                status: `required | in: ACTIVE,INACTIVE`,
                defaultDiscount: `number | normalize: number`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const dealerCode = formatKey(body.dealerCode, '-', true);
            const existCode: any = await Dealer.findOne({ dealerCode, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.DEALER.DETAILS.CODE_EXIST);

            const existEmail: any = await Dealer.findOne({ email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(PANEL_MSG.DEALER.DETAILS.EMAIL_EXIST);

            const record: any = await Dealer.create({
                dealerCode,
                businessName: body.businessName,
                contactName: body.contactName || null,
                email: body.email,
                phoneCode: body.phoneCode || null,
                phone: body.phone || null,
                address: body.address || null,
                city: body.city || null,
                state: body.state || null,
                country: body.country || null,
                taxNumber: body.taxNumber || null,
                status: body.status,
                approvalStatus: 'PENDING',
                defaultDiscount: body.defaultDiscount || 0,
                createdBy: panelUser?._id,
                updatedBy: panelUser?._id,
            });

            await Core.ActivityLog.log({
                req, module: 'DEALER', entityId: record._id, entityLabel: record.businessName, action: 'CREATE',
                changes: Core.ActivityLog.diff({}, record, DEALER_TRACKED_FIELDS),
                summary: `Dealer "${record.businessName}" created`,
            });

            req.setFlash?.('success', PANEL_MSG.DEALER.CREATE.SUCCESS);
            return res.redirect(`/panel/dealers/${record._id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.CREATE.FAIL);
            return res.redirect('/panel/dealers/create');
        }
    }

    static async viewPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Dealer.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const pricingRows = await DealerPricing.find({ dealerId: req.params.id }).populate([{ path: 'productId', model: 'products' }]).sort({ createdAt: -1 }).lean();
            const discountRows = await DealerDiscount.find({ dealerId: req.params.id }).populate([{ path: 'categoryId', model: 'categories' }]).sort({ createdAt: -1 }).lean();
            const auditLogs = await ActivityLog.find({ module: 'DEALER', entityId: req.params.id }).sort({ createdAt: -1 }).limit(30).lean();

            const products = await Product.find({ deletedAt: null }).select('_id name baseSku').sort({ name: 1 }).limit(500).lean();
            const categories = await Category.find({ deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

            return res.render('panel/dealer/view', {
                title: 'Dealer Details',
                layout: 'panel/layout/main',
                record,
                pricingRows,
                discountRows,
                auditLogs,
                products,
                categories,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/dealers');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Dealer.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            return res.render('panel/dealer/form', { title: 'Edit Dealer', layout: 'panel/layout/main', record });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/dealers');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await Dealer.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const sanitizeResult = await sanitize(req?.body, {
                dealerCode: `required | shorttext`,
                businessName: `required | shorttext`,
                contactName: `shorttext`,
                email: `required | email`,
                phoneCode: `shorttext`,
                phone: `shorttext`,
                address: `longtext`,
                city: `shorttext`,
                state: `shorttext`,
                country: `shorttext`,
                taxNumber: `shorttext`,
                status: `required | in: ACTIVE,INACTIVE`,
                defaultDiscount: `number | normalize: number`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const dealerCode = formatKey(body.dealerCode, '-', true);
            const existCode: any = await Dealer.findOne({ _id: { $ne: req.params.id }, dealerCode, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.DEALER.DETAILS.CODE_EXIST);

            const existEmail: any = await Dealer.findOne({ _id: { $ne: req.params.id }, email: body.email, deletedAt: null }).lean();
            if (!empty(existEmail)) throw new Error(PANEL_MSG.DEALER.DETAILS.EMAIL_EXIST);

            const newValues = {
                businessName: body.businessName,
                contactName: body.contactName || null,
                email: body.email,
                phone: body.phone || null,
                status: body.status,
                defaultDiscount: body.defaultDiscount || 0,
            };

            await Dealer.findByIdAndUpdate(req.params.id, {
                dealerCode,
                ...newValues,
                phoneCode: body.phoneCode || null,
                address: body.address || null,
                city: body.city || null,
                state: body.state || null,
                country: body.country || null,
                taxNumber: body.taxNumber || null,
                updatedBy: panelUser?._id,
            });

            const changes = Core.ActivityLog.diff(record, newValues, DEALER_TRACKED_FIELDS);
            await Core.ActivityLog.log({
                req, module: 'DEALER', entityId: req.params.id, entityLabel: body.businessName, action: 'UPDATE',
                changes, summary: changes.length ? undefined : `Dealer "${body.businessName}" updated (no tracked fields changed)`,
            });

            req.setFlash?.('success', PANEL_MSG.DEALER.UPDATE.SUCCESS);
            return res.redirect(`/panel/dealers/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.UPDATE.FAIL);
            return res.redirect(`/panel/dealers/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await Dealer.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            await Dealer.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

            await Core.ActivityLog.log({
                req, module: 'DEALER', entityId: record._id, entityLabel: record.businessName, action: 'DELETE',
                summary: `Dealer "${record.businessName}" deleted`,
            });

            req.setFlash?.('success', PANEL_MSG.DEALER.DELETE.SUCCESS);
            return res.redirect('/panel/dealers');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.DELETE.FAIL);
            return res.redirect('/panel/dealers');
        }
    }

    // approve / reject / suspend / reactivate - one flexible action, mirroring the
    // product module's setStatus pattern {
    static async setApprovalStatus(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const status = req.body?.status;
            if (!APPROVAL_STATUSES.includes(status)) throw new Error(PANEL_MSG.COMMON.DATA.INVALID);

            const record: any = await Dealer.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const remark = getStr(req.body?.remark) || null;

            await Dealer.findByIdAndUpdate(req.params.id, {
                approvalStatus: status,
                approvalRemark: remark,
                approvedBy: panelUser?._id,
                approvedAt: new Date(),
            });

            const summaryByStatus: any = {
                APPROVED: `Dealer approved`,
                REJECTED: `Dealer rejected${remark ? `: ${remark}` : ''}`,
                SUSPENDED: `Dealer suspended${remark ? `: ${remark}` : ''}`,
                PENDING: `Dealer approval reset to pending`,
            };
            await Core.ActivityLog.log({
                req, module: 'DEALER', entityId: req.params.id, entityLabel: record.businessName, action: 'STATUS_CHANGE',
                changes: [{ field: 'approvalStatus', label: 'Approval Status', oldValue: record.approvalStatus, newValue: status }],
                summary: summaryByStatus[status] || `Dealer approval status changed to ${status}`,
            });

            const successMessage: any = {
                APPROVED: PANEL_MSG.DEALER.APPROVAL.APPROVED,
                REJECTED: PANEL_MSG.DEALER.APPROVAL.REJECTED,
                SUSPENDED: PANEL_MSG.DEALER.APPROVAL.SUSPENDED,
                PENDING: PANEL_MSG.DEALER.APPROVAL.REACTIVATED,
            };
            req.setFlash?.('success', successMessage[status] || PANEL_MSG.DEALER.UPDATE.SUCCESS);
            return res.redirect(`/panel/dealers/${req.params.id}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.APPROVAL.FAIL);
            return res.redirect(`/panel/dealers/${req.params.id}`);
        }
    }
    // } approve / reject / suspend / reactivate

    // dealer-specific product pricing {
    static async createPricing(req: any, res: any): Promise<void> {
        const dealerId = req.params.id;

        try {
            const dealer: any = await Dealer.findOne({ _id: dealerId, deletedAt: null }).lean();
            if (empty(dealer)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const sanitizeResult = await sanitize(req?.body, {
                productId: `required | objectId | exist: Product._id (${PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND})`,
                price: `required | number | normalize: number`,
                effectiveFrom: `shorttext`,
                effectiveTo: `shorttext`,
                status: `required | in: ACTIVE,INACTIVE`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            await DealerPricing.create({
                dealerId,
                productId: body.productId,
                price: body.price,
                effectiveFrom: body.effectiveFrom || null,
                effectiveTo: body.effectiveTo || null,
                status: body.status,
            });

            req.setFlash?.('success', PANEL_MSG.DEALER.PRICING.CREATE_SUCCESS);
            return res.redirect(`/panel/dealers/${dealerId}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.PRICING.FAIL);
            return res.redirect(`/panel/dealers/${dealerId}`);
        }
    }

    static async deletePricing(req: any, res: any): Promise<void> {
        const { id: dealerId, pricingId } = req.params;

        try {
            const record: any = await DealerPricing.findOne({ _id: pricingId, dealerId }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.COMMON.DATA.NOT_FOUND);

            await DealerPricing.findByIdAndDelete(pricingId);

            req.setFlash?.('success', PANEL_MSG.DEALER.PRICING.DELETE_SUCCESS);
            return res.redirect(`/panel/dealers/${dealerId}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.PRICING.FAIL);
            return res.redirect(`/panel/dealers/${dealerId}`);
        }
    }
    // } dealer-specific product pricing

    // dealer-specific category discounts {
    static async createDiscount(req: any, res: any): Promise<void> {
        const dealerId = req.params.id;

        try {
            const dealer: any = await Dealer.findOne({ _id: dealerId, deletedAt: null }).lean();
            if (empty(dealer)) throw new Error(PANEL_MSG.DEALER.DETAILS.NOT_FOUND);

            const sanitizeResult = await sanitize(req?.body, {
                categoryId: `required | objectId | exist: Category._id (${PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND})`,
                discountPercent: `required | number | normalize: number`,
                effectiveFrom: `shorttext`,
                effectiveTo: `shorttext`,
                status: `required | in: ACTIVE,INACTIVE`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            await DealerDiscount.create({
                dealerId,
                categoryId: body.categoryId,
                discountPercent: body.discountPercent,
                effectiveFrom: body.effectiveFrom || null,
                effectiveTo: body.effectiveTo || null,
                status: body.status,
            });

            req.setFlash?.('success', PANEL_MSG.DEALER.DISCOUNT.CREATE_SUCCESS);
            return res.redirect(`/panel/dealers/${dealerId}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.DISCOUNT.FAIL);
            return res.redirect(`/panel/dealers/${dealerId}`);
        }
    }

    static async deleteDiscount(req: any, res: any): Promise<void> {
        const { id: dealerId, discountId } = req.params;

        try {
            const record: any = await DealerDiscount.findOne({ _id: discountId, dealerId }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.COMMON.DATA.NOT_FOUND);

            await DealerDiscount.findByIdAndDelete(discountId);

            req.setFlash?.('success', PANEL_MSG.DEALER.DISCOUNT.DELETE_SUCCESS);
            return res.redirect(`/panel/dealers/${dealerId}`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.DEALER.DISCOUNT.FAIL);
            return res.redirect(`/panel/dealers/${dealerId}`);
        }
    }
    // } dealer-specific category discounts

}
