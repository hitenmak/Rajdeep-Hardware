// Models
import { PurchaseOrder } from '../../../models/purchase-order';

// Helpers
import { NON_REVENUE_STATUSES } from '../order/helper';

//--------------------------------------------------------------

export const round2 = (value: number): number => Math.round((value || 0) * 100) / 100;

// "Total Orders" counts every PO; "Total Spent" excludes cancelled / rejected ones
export const lifetimeStats = async (dealerId: any): Promise<{ totalOrders: number, totalSpent: number }> => {
    const [row] = await PurchaseOrder.aggregate([
        { $match: { dealerId, deletedAt: null } },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: { $cond: [{ $in: ['$status', NON_REVENUE_STATUSES] }, 0, '$totalAmount'] } },
            },
        },
    ]);
    return { totalOrders: row?.totalOrders || 0, totalSpent: round2(row?.totalSpent) };
}

// ['2026-04', ..., '2026-09'] ending at `current`
export const previousMonths = (current: string, count: number): string[] => {
    const [year, month] = current.split('-').map(Number);
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    });
}

export const monthLabel = (month: string): string => {
    const [year, m] = month.split('-').map(Number);
    return new Date(Date.UTC(year, m - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}
