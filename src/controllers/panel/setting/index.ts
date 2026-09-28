// Models
import { Setting } from '../../../models/setting';
import { Category } from '../../../models/category';
import { Product } from '../../../models/product';
import { ActivityLog } from '../../../models/activity-log';

// Helpers
import { logError, empty, sanitize, getNum } from '../../../utils';
import MediaManager from '../../../services/media';
import Core from '../../../core';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------
/*
    System Settings - a single admin-only page covering General, Pricing,
    Inventory and Email, all saved through one form/one document (there's
    exactly one Settings record app-wide, matching the pre-existing Branding
    page's own pattern).

    The Pricing tab's rate-based Dynamic Pricing Engine fields (Brass/Aluminium
    Rate, Margin, Tax, Pricing Formula) no longer have a form here - replaced
    by the Bulk Price Adjustment tool below it - but the underlying
    Setting.pricing data and Core.Pricing engine (still used by the product
    form's raw-material auto-pricing) are left untouched: the update below
    always carries the existing `record.pricing` value straight through
    instead of reading it from this form, so it's never silently zeroed out.

    Purchase Orders and Application were dropped from this form's tabs, but
    their fields stay in the schema (PO Prefix/Number Format is still read by
    the Purchase Order module) - `purchaseOrder`/`application` are simply left
    out of the update payload below so whatever is already stored (or the
    schema's own defaults) stays untouched rather than being wiped by a form
    that no longer submits those fields.
*/

const getSingleton = async (): Promise<any> => {
    return await Setting.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
};

const SETTING_TRACKED_FIELDS = [
    { key: 'general.companyName', label: 'Company Name' },
    { key: 'general.timezone', label: 'Timezone' },
    { key: 'general.currency', label: 'Currency' },
    { key: 'inventory.defaultLowStockThreshold', label: 'Default Low Stock Threshold' },
    { key: 'inventory.inventoryAdjustmentRules', label: 'Inventory Adjustment Rules' },
    { key: 'email.smtpHost', label: 'SMTP Host' },
    { key: 'email.smtpPort', label: 'SMTP Port' },
    { key: 'email.smtpUsername', label: 'SMTP Username' },
    { key: 'email.fromEmail', label: 'From Email' },
    { key: 'contactDetails.email', label: 'Contact Email' },
    { key: 'contactDetails.phone', label: 'Contact Phone' },
];

export default class SettingController {

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await getSingleton();
            const categories = await Category.find({ level: 0, status: 'ACTIVE', deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

            return res.render('panel/setting/form', {
                title: 'System Settings',
                layout: 'panel/layout/main',
                record,
                categories,
                logoFullUrl: !empty(record?.branding?.logoFull) ? MediaManager.Setting.get(record.branding.logoFull) : null,
                logoMarkUrl: !empty(record?.branding?.logoMark) ? MediaManager.Setting.get(record.branding.logoMark) : null,
            });
        } catch (e: any) {
            logError(e, '[PANEL-SETTING-EDIT-PAGE] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        try {
            const record: any = await getSingleton();

            const file: any = await MediaManager.Setting.set({ logoFull: '', logoMark: '' }, req, res);
            if (file?.error) throw new Error(file.error);

            const sanitizeResult = await sanitize(file, {
                logoFull: `string`,
                logoMark: `string`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            // remove old files whenever a new one is uploaded {
            if (!empty(body.logoFull) && !empty(record?.branding?.logoFull)) MediaManager.Setting.remove(record.branding.logoFull);
            if (!empty(body.logoMark) && !empty(record?.branding?.logoMark)) MediaManager.Setting.remove(record.branding.logoMark);
            // } remove old files whenever a new one is uploaded

            // The Dynamic Pricing Engine's rate fields no longer have a form on the
            // Pricing tab (replaced by Bulk Price Adjustment), so nothing in
            // req.body can change them any more - carry the existing values
            // through untouched instead of reading req.body (which would
            // otherwise silently zero them out on every save of any tab).
            const previousRates = record?.pricing || {};

            const newValues = {
                general: {
                    companyName: req.body?.companyName || null,
                    timezone: req.body?.timezone || null,
                    currency: req.body?.currency || null,
                },
                inventory: {
                    defaultLowStockThreshold: getNum(req.body?.defaultLowStockThreshold, 0),
                    inventoryAdjustmentRules: req.body?.inventoryAdjustmentRules || null,
                },
                email: {
                    smtpHost: req.body?.smtpHost || null,
                    smtpPort: !empty(req.body?.smtpPort) ? getNum(req.body.smtpPort) : null,
                    smtpUsername: req.body?.smtpUsername || null,
                    fromEmail: req.body?.fromEmail || null,
                },
                contactDetails: {
                    email: req.body?.contactEmail || null,
                    phone: req.body?.contactPhone || null,
                },
            };

            await Setting.findByIdAndUpdate(record._id, {
                branding: {
                    logoFull: body.logoFull || record?.branding?.logoFull || null,
                    logoMark: body.logoMark || record?.branding?.logoMark || null,
                },
                ...newValues,
                pricing: previousRates,
                contactDetails: {
                    ...newValues.contactDetails,
                    phoneCode: req.body?.contactPhoneCode || null,
                    website: record?.contactDetails?.website || null,
                    location: {
                        ...(record?.contactDetails?.location || {}),
                        address1: req.body?.address || null,
                    },
                },
            });

            const changes = Core.ActivityLog.diff(record, newValues, SETTING_TRACKED_FIELDS);
            await Core.ActivityLog.log({
                req, module: 'SETTING', entityId: null, entityLabel: 'System Settings', action: 'UPDATE',
                changes, summary: changes.length ? undefined : 'Settings saved (no tracked fields changed)',
            });

            req.setFlash?.('success', PANEL_MSG.SETTING.UPDATE.SUCCESS);
            return res.redirect('/panel/settings');
        } catch (e: any) {
            logError(e, '[PANEL-SETTING-UPDATE] -');
            req.setFlash?.('error', e?.message || PANEL_MSG.SETTING.UPDATE.FAIL);
            return res.redirect('/panel/settings');
        }
    }

    // Bulk Price Adjustment (Pricing tab) - raise/lower every product's price by a
    // flat percentage across one whole category in a single click, for the common
    // "supplier raised brass rates 10%, reprice the whole Brass Products line"
    // workflow instead of editing products one at a time. Uses aggregation-pipeline
    // updateMany (MongoDB 4.2+) so this scales to any catalogue size in one query
    // per shape (a Simple product's own price, and a Variable product's per-
    // variation prices) rather than loading/looping/saving every product in memory. {
    static async bulkPriceAdjustment(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                categoryId: `required | objectId | exist: Category._id (${PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND})`,
                direction: `required | in: INCREASE,DECREASE`,
                percentage: `required | number | normalize: number`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            if (getNum(body.percentage) <= 0) throw new Error('Percentage must be greater than 0.');

            // snapshot every affected product's price(s) *before* the bulk update,
            // so each one gets its own old->new activity log entry afterwards -
            // this is the same "who changed the price and what was it before"
            // traceability a single product edit gets, just applied per product {
            const beforeProducts: any[] = await Product.find({ categoryId: body.categoryId, deletedAt: null })
                .select('_id name productType pricing.price variations._id variations.sku variations.price').lean();
            if (!beforeProducts.length) throw new Error(PANEL_MSG.SETTING.BULK_PRICE.NO_PRODUCTS);
            const totalProducts = beforeProducts.length;

            const factor = body.direction === 'INCREASE' ? (1 + body.percentage / 100) : (1 - body.percentage / 100);
            if (factor < 0) throw new Error('A decrease of 100% or more would make prices negative.');

            await Promise.all([
                // a Simple product's (and a Variable product's own base) price {
                Product.updateMany(
                    { categoryId: body.categoryId, deletedAt: null, 'pricing.price': { $ne: null } },
                    [{ $set: { 'pricing.price': { $round: [{ $multiply: ['$pricing.price', factor] }, 2] } } }],
                ),
                // } a Simple product's price

                // each of a Variable product's own per-variation prices {
                Product.updateMany(
                    { categoryId: body.categoryId, deletedAt: null, productType: 'VARIABLE' },
                    [{
                        $set: {
                            variations: {
                                $map: {
                                    input: '$variations',
                                    as: 'v',
                                    in: {
                                        $mergeObjects: ['$$v', {
                                            price: {
                                                $cond: [{ $ne: ['$$v.price', null] }, { $round: [{ $multiply: ['$$v.price', factor] }, 2] }, '$$v.price'],
                                            },
                                        }],
                                    },
                                },
                            },
                        },
                    }],
                ),
                // } per-variation prices
            ]);

            const verb = body.direction === 'INCREASE' ? 'increased' : 'decreased';

            // re-fetch the same products' new prices and write one activity log
            // entry per product that actually changed {
            const productIds = beforeProducts.map((p: any) => p._id);
            const afterProducts: any[] = await Product.find({ _id: { $in: productIds } })
                .select('_id pricing.price variations._id variations.price').lean();
            const afterById: any = {};
            afterProducts.forEach((p: any) => afterById[p._id.toString()] = p);

            const actor = Core.ActivityLog.actorFields(req);
            const logEntries: any[] = [];
            beforeProducts.forEach((before: any) => {
                const after = afterById[before._id.toString()];
                if (!after) return;

                const changes: any[] = [];
                if (before.pricing?.price !== after.pricing?.price) {
                    changes.push({ field: 'pricing.price', label: 'Price', oldValue: before.pricing?.price ?? null, newValue: after.pricing?.price ?? null });
                }
                (before.variations || []).forEach((v: any) => {
                    const av = (after.variations || []).find((x: any) => x._id?.toString() === v._id?.toString());
                    if (av && v.price !== av.price) {
                        changes.push({ field: `variations.${v.sku || v._id}.price`, label: `Variation "${v.sku || v._id}" Price`, oldValue: v.price ?? null, newValue: av.price ?? null });
                    }
                });
                if (!changes.length) return;

                logEntries.push({
                    module: 'PRODUCT', entityId: before._id, entityLabel: before.name, action: 'BULK_PRICE_ADJUSTMENT',
                    changes, summary: `Bulk price ${verb} by ${body.percentage}% (${Core.ActivityLog.summarize(changes)})`,
                    ...actor,
                });
            });
            if (logEntries.length) await ActivityLog.insertMany(logEntries);
            // }

            req.setFlash?.('success', `Prices ${verb} by ${body.percentage}% for ${totalProducts} product(s) in the selected category.`);
            return res.redirect('/panel/settings');
        } catch (e: any) {
            logError(e, '[PANEL-SETTING-BULK-PRICE] -');
            req.setFlash?.('error', e?.message || PANEL_MSG.SETTING.BULK_PRICE.FAIL);
            return res.redirect('/panel/settings');
        }
    }
    // } Bulk Price Adjustment

}
