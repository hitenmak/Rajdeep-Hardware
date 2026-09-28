// Models
import { User } from '../../../models/user';
import { Product } from '../../../models/product';
import { LoginAudit } from '../../../models/login-audit';
import { Dealer } from '../../../models/dealer';
import { PurchaseOrder } from '../../../models/purchase-order';

// Helpers
import { logError } from '../../../utils';

//--------------------------------------------------------------

const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

function buildLoginTrend(rows: { _id: { day: string; status: string }; count: number }[]): { date: string; success: number; failed: number }[] {
    const byDay: Record<string, { success: number; failed: number }> = {};
    rows.forEach((r) => {
        const day = r._id.day;
        byDay[day] = byDay[day] || { success: 0, failed: 0 };
        if (r._id.status === 'SUCCESS') byDay[day].success += r.count;
        else byDay[day].failed += r.count;
    });

    const days: { date: string; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, success: byDay[key]?.success || 0, failed: byDay[key]?.failed || 0 });
    }
    return days;
}

export default class DashboardController {

    static async index(req: any, res: any): Promise<void> {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const lowStockFilter = {
                deletedAt: null,
                productType: 'SIMPLE',
                'inventory.inventoryTracking': { $ne: false },
                $expr: { $lte: ['$inventory.globalStock', '$inventory.lowStockThreshold'] },
            };

            const [
                userCount, dealerCount, purchaseOrderCount,
                productCount, activeProductCount, lowStockCount, lowStockProducts,
                productsByStatusRaw, productsByCategoryRaw, loginTrendRaw,
                recentLogins,
            ] = await Promise.all([
                User.countDocuments({ deletedAt: null }),
                Dealer.countDocuments({ deletedAt: null }),
                PurchaseOrder.countDocuments({ deletedAt: null }),
                Product.countDocuments({ deletedAt: null }),
                Product.countDocuments({ deletedAt: null, status: 'ACTIVE' }),
                Product.countDocuments(lowStockFilter),
                Product.find(lowStockFilter).select('name baseSku inventory.globalStock inventory.lowStockThreshold').sort({ 'inventory.globalStock': 1 }).limit(5).lean(),
                Product.aggregate([
                    { $match: { deletedAt: null } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
                Product.aggregate([
                    { $match: { deletedAt: null, categoryId: { $ne: null } } },
                    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 6 },
                    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
                    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                    { $project: { _id: 0, name: { $ifNull: ['$category.name', 'Uncategorized'] }, count: 1 } },
                ]),
                LoginAudit.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, status: '$status' }, count: { $sum: 1 } } },
                ]),
                LoginAudit.find({}).sort({ createdAt: -1 }).limit(6).populate([{ path: 'userId', model: 'users' }]).lean(),
            ]);

            const statusCountMap: Record<string, number> = {};
            productsByStatusRaw.forEach((r: any) => { statusCountMap[r._id || 'DRAFT'] = r.count; });
            const productsByStatus = PRODUCT_STATUSES.map((s) => ({ status: s, count: statusCountMap[s] || 0 }));

            return res.render('panel/dashboard/index', {
                title: 'Dashboard',
                eyebrow: 'Overview',
                layout: 'panel/layout/main',
                stats: {
                    userCount, dealerCount, purchaseOrderCount,
                    productCount, activeProductCount, lowStockCount,
                },
                productsByStatus,
                productsByCategory: productsByCategoryRaw,
                loginTrend: buildLoginTrend(loginTrendRaw),
                recentLogins,
                lowStockProducts,
            });
        } catch (e: any) {
            logError(e, '[PANEL-DASHBOARD] -');
            return res.render('panel/dashboard/index', {
                title: 'Dashboard',
                eyebrow: 'Overview',
                layout: 'panel/layout/main',
                stats: { userCount: 0, dealerCount: 0, purchaseOrderCount: 0, productCount: 0, activeProductCount: 0, lowStockCount: 0 },
                productsByStatus: PRODUCT_STATUSES.map((s) => ({ status: s, count: 0 })),
                productsByCategory: [],
                loginTrend: [],
                recentLogins: [],
                lowStockProducts: [],
            });
        }
    }

}
