// Models
import { PurchaseOrder } from '../../../models/purchase-order';

// Helpers
import { getStr } from '../../../utils';
import * as OrderHelper from '../order/helper';
import { previousMonths, monthLabel, round2 } from '../common/stats';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

const ANALYTICS_MONTHS = 6;
const RECENT_ORDERS = 3;

export default class Dashboard {

    // "Dealer Dashboard": monthly spend, open orders, 6-month purchase chart, recent orders
    static async index(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const timezone = await OrderHelper.getTimezone();
            const months = previousMonths(OrderHelper.currentMonth(timezone), ANALYTICS_MONTHS);
            const thisMonth = months[months.length - 1];
            const month = OrderHelper.monthExpr('$orderDate', timezone);
            const own = { dealerId: authDealer._id, deletedAt: null };

            const [perMonth, pendingOrders, recent] = await Promise.all([
                PurchaseOrder.aggregate([
                    { $match: own },
                    { $addFields: { month } },
                    { $match: { month: { $in: months } } },
                    {
                        $group: {
                            _id: '$month',
                            orders: { $sum: 1 },
                            amount: { $sum: { $cond: [{ $in: ['$status', OrderHelper.NON_REVENUE_STATUSES] }, 0, '$totalAmount'] } },
                        },
                    },
                ]),
                PurchaseOrder.countDocuments({ ...own, status: { $in: OrderHelper.OPEN_STATUSES } }),
                PurchaseOrder.find(own).select('poNumber orderDate items.quantity totalAmount status').sort({ orderDate: -1 }).limit(RECENT_ORDERS).lean(),
            ]);

            // zero-filled so the chart always has 6 bars
            const byMonth = new Map(perMonth.map((row: any) => [getStr(row._id), row]));
            const analytics = months.map((m) => ({
                month: m,
                label: monthLabel(m),
                amount: round2((byMonth.get(m) as any)?.amount || 0),
                orders: (byMonth.get(m) as any)?.orders || 0,
            }));
            const current = analytics[analytics.length - 1];

            const data = {
                dealer: { businessName: getStr(authDealer.businessName), contactName: getStr(authDealer.contactName) },
                summary: {
                    monthlySales: current.amount,
                    ordersThisMonth: current.orders,
                    pendingOrders,
                    currency: 'INR',
                    month: thisMonth,
                },
                analytics,
                recentOrders: recent.map(OrderHelper.orderCard),
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.DASHBOARD.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-DASHBOARD] -');
        }
    }

}
