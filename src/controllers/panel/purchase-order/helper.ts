// Helpers
import { empty, getNum, getStr } from '../../../utils';

//--------------------------------------------------------------
/*
    Pure helpers for the Purchase Order admin module - PO number generation,
    item/total calculation, and the status state-machine. The form has no
    backing REST API, matching the rest of this admin panel.
*/

export const STATUSES = [
    'PENDING', 'UNDER_REVIEW', 'PARTIALLY_APPROVED', 'APPROVED',
    'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'REJECTED', 'CANCELLED',
];

// which department (from RolePermission.department) may move a PO from one
// status to another - checked in addition to the PURCHASE-ORDER.CHANGE-STATUS
// permission, and in addition to the assignment check (done by the caller) {
export const STATUS_TRANSITIONS: Record<string, Record<string, string[]>> = {
    PENDING: {
        UNDER_REVIEW: ['ACCOUNT_MANAGER'],
        CANCELLED: ['ACCOUNT_MANAGER'],
    },
    UNDER_REVIEW: {
        CANCELLED: ['ACCOUNT_MANAGER'],
    },
    APPROVED: {
        PACKING: ['PACKAGE_MANAGER'],
    },
    PARTIALLY_APPROVED: {
        PACKING: ['PACKAGE_MANAGER'],
    },
    PACKING: {
        READY_FOR_DELIVERY: ['PACKAGE_MANAGER'],
    },
    READY_FOR_DELIVERY: {
        OUT_FOR_DELIVERY: ['DELIVERY_MANAGER'],
    },
    OUT_FOR_DELIVERY: {
        DELIVERED: ['DELIVERY_MANAGER'],
    },
};

// department that is always allowed to move any status forward regardless of
// the table above (Admin/isMaster is handled separately by the caller)
export const canChangeStatus = (currentStatus: string, newStatus: string, department: string | null): boolean => {
    const allowedDepartments = STATUS_TRANSITIONS[currentStatus]?.[newStatus];
    if (!allowedDepartments) return false;
    return allowedDepartments.includes(department || '');
}

// builds a PO number from the Settings > Purchase Orders "PO Number Format"
// template (e.g. "{PREFIX}-{SEQUENCE:6}"), falling back to the old hardcoded
// pattern if Settings hasn't been configured yet {
export const generatePoNumber = (sequence: number, prefix: string | null = 'PO', format: string | null = '{PREFIX}-{SEQUENCE:6}'): string => {
    const template = format || '{PREFIX}-{SEQUENCE:6}';
    return template
        .replace(/\{PREFIX\}/g, prefix || 'PO')
        .replace(/\{SEQUENCE:(\d+)\}/g, (_match: string, width: string) => String(sequence).padStart(Number(width), '0'))
        .replace(/\{SEQUENCE\}/g, String(sequence));
}

export const parseItems = (rawItems: any = []): any[] => {
    const list = Array.isArray(rawItems) ? rawItems : Object.values(rawItems || {});
    return list
        .filter((row: any) => !empty(row?.productId) && !empty(row?.quantity))
        .map((row: any) => {
            const quantity = getNum(row.quantity, 0);
            const unitPrice = getNum(row.unitPrice, 0);
            const discount = getNum(row.discount, 0);
            const tax = getNum(row.tax, 0);
            const lineSubtotal = quantity * unitPrice;
            const total = Math.max(0, lineSubtotal - discount) + tax;

            return {
                productId: row.productId,
                sku: row.sku || null,
                productName: row.productName || null,
                quantity,
                unitPrice,
                discount,
                tax,
                total: +total.toFixed(2),
            };
        });
}

// lines matched on product + SKU keep the variant fields the panel form doesn't render
export const carryLineSnapshots = (existing: any[] = [], parsed: any[] = []): any[] => {
    const pool = [...(existing || [])];
    return parsed.map((row: any) => {
        const index = pool.findIndex((e: any) => getStr(e.productId) === getStr(row.productId) && getStr(e.sku) === getStr(row.sku));
        if (index === -1) return row;
        const [match] = pool.splice(index, 1);
        return { ...row, variationId: match.variationId ?? null, variantLabel: match.variantLabel ?? null, mrp: match.mrp ?? null };
    });
}

export const computeTotals = (items: any[], shipping: number = 0): { subtotal: number; discount: number; tax: number; totalAmount: number } => {
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const discount = items.reduce((sum, i) => sum + (i.discount || 0), 0);
    const tax = items.reduce((sum, i) => sum + (i.tax || 0), 0);
    const totalAmount = Math.max(0, subtotal - discount) + tax + (shipping || 0);

    return {
        subtotal: +subtotal.toFixed(2),
        discount: +discount.toFixed(2),
        tax: +tax.toFixed(2),
        totalAmount: +totalAmount.toFixed(2),
    };
}

// applies an admin's per-item approve/reject decision and derives the overall PO status {
export const applyReviewDecision = (items: any[], rawDecisions: any = {}): { items: any[]; overallStatus: string } => {
    let anyApproved = false;
    let anyRejected = false;
    let allFullyApproved = true;

    const updatedItems = items.map((item: any, index: number) => {
        const decision = rawDecisions?.[index] || rawDecisions?.[getStr(item._id)] || {};
        const requestedQuantity = item.quantity || 0;
        let approvedQuantity = decision.approvedQuantity != null && decision.approvedQuantity !== '' ? getNum(decision.approvedQuantity, 0) : requestedQuantity;
        approvedQuantity = Math.max(0, Math.min(approvedQuantity, requestedQuantity));
        const rejectedQuantity = requestedQuantity - approvedQuantity;

        if (approvedQuantity > 0) anyApproved = true;
        if (rejectedQuantity > 0) anyRejected = true;
        if (approvedQuantity < requestedQuantity) allFullyApproved = false;

        return {
            ...item,
            approvedQuantity,
            rejectedQuantity,
            remarks: decision.remarks || item.remarks || null,
        };
    });

    let overallStatus = 'REJECTED';
    if (anyApproved && allFullyApproved) overallStatus = 'APPROVED';
    else if (anyApproved && anyRejected) overallStatus = 'PARTIALLY_APPROVED';
    else if (anyApproved) overallStatus = 'APPROVED';

    return { items: updatedItems, overallStatus };
}
// } applies an admin's per-item approve/reject decision and derives the overall PO status
