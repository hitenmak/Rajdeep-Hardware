import crypto from 'crypto';

// Models
import { PurchaseOrder } from '../../../models/purchase-order';
import { PurchaseOrderStatusHistory } from '../../../models/purchase-order-status-history';
import { DealerCart } from '../../../models/dealer-cart';
import { Setting } from '../../../models/setting';

// Helpers
import { empty, getNum, getStr, formatDate } from '../../../utils';
import Core from '../../../core';
import MediaManager from '../../../services/media';
import { SEQUENCE } from '../../../core/Sequence';
import { generatePoNumber } from '../../panel/purchase-order/helper';
import * as Helper from './helper';
import { getOrCreateCart, formatCart } from '../cart/helper';
import { validate } from '../common/validate';
import { getPagination, paginationMeta } from '../common/pagination';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

// a crashed checkout must not block the dealer forever
const CHECKOUT_LOCK_TTL_MS = 60 * 1000;
const PRICE_TOLERANCE = 0.01;

const findOwnOrder = async (dealerId: any, orderId: string): Promise<any> => {
    // dealerId in the filter is the ownership check - one dealer can never read another's PO
    const order: any = await PurchaseOrder.findOne({ _id: orderId, dealerId, deletedAt: null }).lean();
    if (empty(order)) throw new ApiError(HTTP_STATUS.NOT_FOUND, DEALER_MSG.ORDER.NOT_FOUND);
    return order;
}

export default class Order {

    // "Create PO": turns the whole cart into a PENDING purchase order
    static async create(req: any, res: any): Promise<void> {
        const { authDealer } = req;
        let lockedCartId: any = null;

        try {
            const body = await validate(req?.body, {
                shippingAddress: `required | longtext`,
                specialInstructions: `longtext`,
                termsAccepted: `required | boolean`,
                expectedTotal: `number`,
            });
            if (body.termsAccepted !== true) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.ORDER.TERMS_REQUIRED);

            const settings: any = await Setting.findOne({}).select('purchaseOrder').lean();
            if (settings?.purchaseOrder?.requiredRemarks && empty(body.specialInstructions)) {
                throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.ORDER.REMARKS_REQUIRED);
            }

            // take the checkout lock - a double tap on "Create PO" must not create two orders {
            await getOrCreateCart(authDealer._id);
            const now = new Date();
            const cart: any = await DealerCart.findOneAndUpdate(
                { dealerId: authDealer._id, $or: [{ checkoutLockedAt: null }, { checkoutLockedAt: { $lt: new Date(now.getTime() - CHECKOUT_LOCK_TTL_MS) } }] },
                { checkoutLockedAt: now },
                { new: true },
            ).lean();
            if (!cart) throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.ORDER.CHECKOUT_IN_PROGRESS);
            lockedCartId = cart._id;
            // } take the checkout lock

            if (empty(cart.items)) throw new ApiError(HTTP_STATUS.BAD_REQUEST, DEALER_MSG.ORDER.CART_EMPTY);

            // re-price from live data; the dealer gets the fresh cart back whenever it can't go through as-is
            const priced = await Core.DealerCart.price(authDealer, cart);
            if (!priced.canCheckout) throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.ORDER.CART_HAS_ISSUES, { cart: formatCart(priced) });
            if (body.expectedTotal !== undefined && body.expectedTotal !== null && Math.abs(getNum(body.expectedTotal) - priced.summary.total) > PRICE_TOLERANCE) {
                throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.ORDER.PRICE_CHANGED, { cart: formatCart(priced) });
            }

            const sequence = await Core.Sequence.next(SEQUENCE.PURCHASE_ORDER, () => PurchaseOrder.countDocuments({}));
            const poNumber = generatePoNumber(sequence, settings?.purchaseOrder?.poPrefix, settings?.purchaseOrder?.poNumberFormat);

            // item shape matches the panel's (unitPrice pre-GST, tax + total per line) so admin review/edit keeps working
            const order: any = await PurchaseOrder.create({
                poNumber,
                dealerId: authDealer._id,
                orderDate: now,
                items: priced.lines.map((l) => ({
                    productId: l.productId,
                    variationId: l.variationId,
                    sku: l.sku || null,
                    productName: l.name,
                    variantLabel: l.variantLabel,
                    mrp: l.mrp,
                    quantity: l.quantity,
                    unitPrice: l.taxableUnitPrice,
                    discount: 0,
                    tax: l.lineTax,
                    total: l.lineTotal,
                })),
                subtotal: priced.summary.subtotal,
                discount: 0,
                tax: priced.summary.tax,
                shipping: priced.summary.shipping,
                totalAmount: priced.summary.total,
                remarks: body.specialInstructions || null,
                shippingAddress: body.shippingAddress,
                termsAcceptedAt: now,
                source: 'DEALER_APP',
                status: 'PENDING',
            });

            await PurchaseOrderStatusHistory.create({ purchaseOrderId: order._id, oldStatus: null, newStatus: 'PENDING', remarks: 'Purchase order placed by dealer via app', changedBy: null });

            // remove only what was ordered and release the lock in one write
            const orderedItemIds = cart.items.map((i: any) => i._id);
            await DealerCart.updateOne({ _id: cart._id }, { $pull: { items: { _id: { $in: orderedItemIds } } }, $set: { checkoutLockedAt: null } });
            lockedCartId = null;

            return res.status(201).send({ status: true, message: DEALER_MSG.ORDER.CREATED, data: Helper.orderDetail(order.toObject(), [{ newStatus: 'PENDING', createdAt: now }]) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-ORDER-CREATE] -');
        } finally {
            if (lockedCartId) await DealerCart.updateOne({ _id: lockedCartId }, { checkoutLockedAt: null }).catch(() => null);
        }
    }

    static async list(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                month: `string`,
                status: `string`,
            });
            if (!empty(body.month) && !Helper.MONTH_REGEX.test(body.month)) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, 'Month must be in YYYY-MM format');
            if (!empty(body.status) && !Helper.STATUS_DISPLAY[body.status]) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.COMMON.DATA.INVALID);

            const pagination = getPagination(req?.body);
            const timezone = await Helper.getTimezone();
            const month = Helper.monthExpr('$orderDate', timezone);

            const own = { dealerId: authDealer._id, deletedAt: null };
            const query: any = { ...own };
            if (!empty(body.status)) query.status = body.status;
            if (!empty(body.month)) query.$expr = { $eq: [month, body.month] };

            const [orders, totalDocs, [stats]] = await Promise.all([
                PurchaseOrder.find(query).select('poNumber orderDate items.quantity totalAmount status').sort({ orderDate: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
                PurchaseOrder.countDocuments(query),
                PurchaseOrder.aggregate([
                    { $match: own },
                    {
                        $facet: {
                            totals: [
                                {
                                    $group: {
                                        _id: null,
                                        totalOrders: { $sum: 1 },
                                        revenueOrders: { $sum: { $cond: [{ $in: ['$status', Helper.NON_REVENUE_STATUSES] }, 0, 1] } },
                                        revenue: { $sum: { $cond: [{ $in: ['$status', Helper.NON_REVENUE_STATUSES] }, 0, '$totalAmount'] } },
                                        thisMonth: { $sum: { $cond: [{ $and: [{ $eq: [month, Helper.currentMonth(timezone)] }, { $not: [{ $in: ['$status', Helper.NON_REVENUE_STATUSES] }] }] }, '$totalAmount', 0] } },
                                    },
                                },
                            ],
                            months: [{ $group: { _id: month } }, { $sort: { _id: -1 } }, { $limit: 12 }],
                        },
                    },
                ]),
            ]);

            const totals = stats?.totals?.[0] || {};
            const round2 = (v: number) => Math.round((v || 0) * 100) / 100;
            const data = {
                summary: {
                    totalOrders: totals.totalOrders || 0,
                    thisMonthAmount: round2(totals.thisMonth),
                    averageOrderValue: totals.revenueOrders ? round2(totals.revenue / totals.revenueOrders) : 0,
                    currency: 'INR',
                },
                months: (stats?.months || []).map((m: any) => m._id), // chips, newest first
                records: orders.map(Helper.orderCard),
                pagination: paginationMeta(pagination, totalDocs),
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.ORDER.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-ORDER-LIST] -');
        }
    }

    static async details(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                orderId: `required | objectId`,
            });

            const order = await findOwnOrder(authDealer._id, body.orderId);
            const history = await PurchaseOrderStatusHistory.find({ purchaseOrderId: order._id }).select('newStatus createdAt').sort({ createdAt: 1 }).lean();

            return res.status(200).send({ status: true, message: DEALER_MSG.ORDER.DETAILS_FOUND, data: Helper.orderDetail(order, history) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-ORDER-DETAILS] -');
        }
    }

    // "PO Preview" / share: generated on first request, reused until the PO changes
    static async pdf(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                orderId: `required | objectId`,
            });

            const order = await findOwnOrder(authDealer._id, body.orderId);
            const cached = order.pdf?.generatedAt && new Date(order.pdf.generatedAt) >= new Date(order.updatedAt) && MediaManager.PurchaseOrder.exists(order.pdf?.fileName);

            let fileName = order.pdf?.fileName;
            if (!cached) {
                const setting: any = await Setting.findOne({}).select('general contactDetails branding').lean();
                const content = {
                    order,
                    dealer: authDealer,
                    company: {
                        name: getStr(setting?.general?.companyName) || 'Rajdeep Hardware',
                        email: getStr(setting?.contactDetails?.email),
                        phone: [getStr(setting?.contactDetails?.phoneCode), getStr(setting?.contactDetails?.phone)].filter(Boolean).join(' '),
                        logoUrl: empty(setting?.branding?.logoFull) ? null : MediaManager.Setting.get(setting.branding.logoFull),
                    },
                    status: Helper.status(order.status),
                    formatDate: (d: any) => formatDate(d, 'MMM DD, YYYY'),
                    money: (v: any) => `₹${getNum(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                };

                // random suffix: storage is publicly served, so the URL must not be guessable from the PO number
                fileName = `${getStr(order.poNumber).replace(/[^A-Za-z0-9-]/g, '')}-${crypto.randomBytes(12).toString('hex')}.pdf`;
                const generated: any = await MediaManager.PurchaseOrder.generatePdf({
                    content,
                    template: 'dealer-purchase-order',
                    fileName,
                    pageSetup: { format: 'A4', width: undefined, height: undefined, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } },
                });
                if (generated?.error) throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, DEALER_MSG.ORDER.PDF_FAILED);

                // timestamps:false so recording the PDF doesn't itself make the PDF look stale
                await PurchaseOrder.updateOne({ _id: order._id }, { pdf: { fileName, generatedAt: new Date() } }, { timestamps: false });
            }

            return res.status(200).send({ status: true, message: DEALER_MSG.ORDER.PDF_READY, data: { url: MediaManager.PurchaseOrder.get(fileName), fileName } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-ORDER-PDF] -');
        }
    }

}
