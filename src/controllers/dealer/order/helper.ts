// Models
import { Setting } from '../../../models/setting';

// Helpers
import { getNum, getStr } from '../../../utils';

// Interfaces
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// Orders that don't count towards spend / averages
export const NON_REVENUE_STATUSES = ['CANCELLED', 'REJECTED'];
export const OPEN_STATUSES = ['PENDING', 'UNDER_REVIEW'];

// dealer-facing wording for the internal PO state machine
export const STATUS_DISPLAY: { [key: string]: { label: string, group: string, message: string } } = {
    PENDING: { label: 'Pending Approval', group: 'PENDING', message: 'Your purchase order has been submitted and is awaiting review.' },
    UNDER_REVIEW: { label: 'Under Review', group: 'PENDING', message: 'Your purchase order is being reviewed.' },
    APPROVED: { label: 'Approved', group: 'IN_PROGRESS', message: 'Your purchase order has been reviewed and approved.' },
    PARTIALLY_APPROVED: { label: 'Partially Approved', group: 'IN_PROGRESS', message: 'Your purchase order has been partially approved. See item quantities for details.' },
    PACKING: { label: 'Processing', group: 'IN_PROGRESS', message: 'Your order is being packed.' },
    READY_FOR_DELIVERY: { label: 'Processing', group: 'IN_PROGRESS', message: 'Your order is packed and ready for dispatch.' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', group: 'IN_PROGRESS', message: 'Your order is on its way.' },
    DELIVERED: { label: 'Delivered', group: 'COMPLETED', message: 'Your order has been delivered.' },
    REJECTED: { label: 'Rejected', group: 'CLOSED', message: 'Your purchase order was not approved.' },
    CANCELLED: { label: 'Cancelled', group: 'CLOSED', message: 'This purchase order was cancelled.' },
};

export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const status = (key: any): IObj => {
    const display = STATUS_DISPLAY[getStr(key)] || { label: getStr(key), group: 'PENDING', message: '' };
    return { key: getStr(key), label: display.label, group: display.group };
}

export const getTimezone = async (): Promise<string> => {
    const setting: any = await Setting.findOne({}).select('general.timezone').lean();
    return getStr(setting?.general?.timezone) || DEFAULT_TIMEZONE;
}

// "YYYY-MM" of a date in the business timezone - month chips follow the distributor's calendar, not UTC
export const monthExpr = (field: string, timezone: string): any => ({ $dateToString: { format: '%Y-%m', date: field, timezone } });

export const currentMonth = (timezone: string): string => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
}

export const orderCard = (po: IObj): IObj => ({
    id: getStr(po._id),
    poNumber: getStr(po.poNumber),
    orderDate: po.orderDate,
    itemCount: (po.items || []).length,
    totalQuantity: (po.items || []).reduce((sum: number, i: any) => sum + (getNum(i.quantity) || 0), 0),
    totalAmount: getNum(po.totalAmount),
    currency: 'INR',
    status: status(po.status),
});

// timeline deliberately omits history remarks - those are written by admin staff for internal use
export const orderDetail = (po: IObj, history: any[] = []): IObj => ({
    ...orderCard(po),
    statusMessage: STATUS_DISPLAY[getStr(po.status)]?.message || '',
    lastUpdatedAt: po.updatedAt,
    source: getStr(po.source) || 'PANEL',
    shippingAddress: getStr(po.shippingAddress),
    specialInstructions: getStr(po.remarks),
    items: (po.items || []).map((i: any) => ({
        id: getStr(i._id),
        productId: getStr(i.productId),
        variationId: getStr(i.variationId) || null,
        name: getStr(i.productName),
        sku: getStr(i.sku),
        variantLabel: getStr(i.variantLabel) || null,
        quantity: getNum(i.quantity),
        approvedQuantity: i.approvedQuantity ?? null,
        rejectedQuantity: i.rejectedQuantity ?? null,
        unitPrice: getNum(i.unitPrice),
        mrp: i.mrp ?? null,
        tax: getNum(i.tax),
        total: getNum(i.total),
    })),
    summary: {
        subtotal: getNum(po.subtotal),
        discount: getNum(po.discount),
        tax: getNum(po.tax),
        shipping: getNum(po.shipping),
        total: getNum(po.totalAmount),
        currency: 'INR',
    },
    timeline: history.map((h: any) => ({ status: status(h.newStatus), at: h.createdAt })),
});
