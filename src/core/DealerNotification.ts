// Models
import { Notification } from '../models/notification';
import { DealerSession } from '../models/dealer-session';
import { Dealer } from '../models/dealer';

// Helpers
import { empty, getStr, logError } from '../utils';
import pushNotification from '../services/push-notification/handler';

//--------------------------------------------------------------
/*
    In-app notifications for dealers (+ best-effort push to their logged-in devices).
    notify() never throws: a notification must not fail the admin action that triggered it.
*/

export const DEALER_NOTIFICATION_TYPE = {
    ORDER_STATUS: 'ORDER_STATUS',
    PRICE_UPDATED: 'PRICE_UPDATED',
    NEW_ARRIVAL: 'NEW_ARRIVAL',
    LOW_STOCK: 'LOW_STOCK',
};

export interface IDealerNotificationPayload {
    type: string;
    title: string;
    description: string;
    navigateTo?: string | null; // app route hint, e.g. ORDER_DETAILS
    data?: any;
}

// dealer-facing wording per PO status; statuses not listed here don't notify
const ORDER_STATUS_COPY: { [key: string]: { title: string, description: (po: string) => string } } = {
    UNDER_REVIEW: { title: 'Order Under Review', description: (po) => `${po} is being reviewed` },
    APPROVED: { title: 'Order Approved', description: (po) => `${po} has been approved & scheduled for dispatch` },
    PARTIALLY_APPROVED: { title: 'Order Partially Approved', description: (po) => `${po} has been partially approved. Check item quantities` },
    PACKING: { title: 'Order Processing', description: (po) => `${po} is being packed` },
    OUT_FOR_DELIVERY: { title: 'Order Out for Delivery', description: (po) => `${po} is on its way` },
    DELIVERED: { title: 'Order Delivered', description: (po) => `${po} has been delivered` },
    REJECTED: { title: 'Order Rejected', description: (po) => `${po} was not approved` },
    CANCELLED: { title: 'Order Cancelled', description: (po) => `${po} has been cancelled` },
};

export default class DealerNotification {

    static async notify(dealerId: any, payload: IDealerNotificationPayload): Promise<void> {
        try {
            if (empty(dealerId)) return;

            await Notification.create({
                dealerId,
                type: payload.type,
                title: payload.title,
                description: payload.description,
                navigateTo: payload.navigateTo || null,
                data: payload.data || null,
                isRead: false,
            });

            const dealer: any = await Dealer.findOne({ _id: dealerId, deletedAt: null }).select('preferences').lean();
            if (dealer?.preferences?.pushNotifications === false) return;

            const sessions = await DealerSession.find({ dealerId, revokedAt: null, expiresAt: { $gt: new Date() }, fcmToken: { $ne: null } }).select('fcmToken').lean();
            const fcmTokens = [...new Set(sessions.map((s: any) => getStr(s.fcmToken)).filter(Boolean))];
            if (fcmTokens.length) await pushNotification({ fcmTokens, title: payload.title, body: payload.description, data: { type: payload.type, navigateTo: payload.navigateTo, ...(payload.data || {}) } });
        } catch (e: any) {
            logError(e, '[DEALER-NOTIFICATION-NOTIFY] -');
        }
    }

    // fan-out for broadcasts: one insert, one query each for preferences and device tokens
    static async notifyMany(entries: { dealerId: any, payload: IDealerNotificationPayload }[]): Promise<void> {
        try {
            if (!entries.length) return;

            await Notification.insertMany(entries.map(({ dealerId, payload }) => ({
                dealerId,
                type: payload.type,
                title: payload.title,
                description: payload.description,
                navigateTo: payload.navigateTo || null,
                data: payload.data || null,
                isRead: false,
            })));

            const dealerIds = [...new Set(entries.map((e) => getStr(e.dealerId)))];
            const [optedOut, sessions] = await Promise.all([
                Dealer.find({ _id: { $in: dealerIds }, 'preferences.pushNotifications': false }).select('_id').lean(),
                DealerSession.find({ dealerId: { $in: dealerIds }, revokedAt: null, expiresAt: { $gt: new Date() }, fcmToken: { $ne: null } }).select('dealerId fcmToken').lean(),
            ]);
            const skip = new Set(optedOut.map((d: any) => getStr(d._id)));
            const tokensByDealer = new Map<string, Set<string>>();
            sessions.forEach((s: any) => {
                const id = getStr(s.dealerId);
                if (skip.has(id)) return;
                tokensByDealer.set(id, (tokensByDealer.get(id) || new Set()).add(getStr(s.fcmToken)));
            });

            for (const { dealerId, payload } of entries) {
                const fcmTokens = [...(tokensByDealer.get(getStr(dealerId)) || [])];
                if (fcmTokens.length) await pushNotification({ fcmTokens, title: payload.title, body: payload.description, data: { type: payload.type, navigateTo: payload.navigateTo, ...(payload.data || {}) } });
            }
        } catch (e: any) {
            logError(e, '[DEALER-NOTIFICATION-NOTIFY-MANY] -');
        }
    }

    static async orderStatusChanged(order: any, newStatus: string): Promise<void> {
        const copy = ORDER_STATUS_COPY[newStatus];
        if (!copy || empty(order?.dealerId)) return;

        const poNumber = getStr(order.poNumber);
        await this.notify(order.dealerId, {
            type: DEALER_NOTIFICATION_TYPE.ORDER_STATUS,
            title: copy.title,
            description: copy.description(poNumber),
            navigateTo: 'ORDER_DETAILS',
            data: { orderId: getStr(order._id), poNumber, status: newStatus },
        });
    }

}
