// Models
import { PurchaseOrder } from '../../../models/purchase-order';
import { Dealer } from '../../../models/dealer';
import { Product } from '../../../models/product';

// Helpers
import { getStr } from '../../../utils';

//--------------------------------------------------------------
/*
    Reporting aggregations. Shared between each report's page render and its
    export action, so the numbers shown on screen and in the downloaded file
    always match exactly.

    Grouping is done in plain JS after a single `find`, rather than a Mongo
    aggregation pipeline - this business's PO volume doesn't call for
    pipeline-level performance, and a plain reduce is far easier to verify
    for correctness.

    "Sales" here means purchase order items that have actually moved past
    review - PENDING/UNDER_REVIEW (not yet decided) and REJECTED/CANCELLED
    (never fulfilled) are excluded from every sales-derived figure below.
*/

export const SALE_STATUSES = ['PARTIALLY_APPROVED', 'APPROVED', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const buildDateRangeQuery = (dateFrom?: string, dateTo?: string): any => {
    const query: any = {};
    if (dateFrom || dateTo) {
        query.orderDate = {};
        if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
        if (dateTo) query.orderDate.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }
    return query;
}

const fetchSaleOrders = async (filters: any = {}): Promise<any[]> => {
    const query: any = { deletedAt: null, status: { $in: SALE_STATUSES }, ...buildDateRangeQuery(filters.dateFrom, filters.dateTo) };
    if (filters.dealerId) query.dealerId = filters.dealerId;
    if (filters.status) query.status = filters.status;

    return await PurchaseOrder.find(query).populate([{ path: 'dealerId', model: 'dealers' }]).sort({ orderDate: -1 }).lean();
}

// Sales Report - one row per PO item {
export const getSalesReport = async (filters: any = {}): Promise<any[]> => {
    const orders = await fetchSaleOrders(filters);
    const rows: any[] = [];

    orders.forEach((po: any) => {
        (po.items || []).forEach((item: any) => {
            rows.push({
                poNumber: po.poNumber,
                dealerName: po.dealerId ? po.dealerId.businessName : '-',
                orderDate: po.orderDate,
                status: po.status,
                productName: item.productName,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                tax: item.tax,
                total: item.total,
            });
        });
    });

    return rows;
}
// } Sales Report

// Dealer Performance Report {
export const getDealerPerformanceReport = async (filters: any = {}): Promise<any[]> => {
    const orders = await fetchSaleOrders(filters);
    const byDealer: Record<string, any> = {};

    orders.forEach((po: any) => {
        const key = getStr(po.dealerId?._id || po.dealerId) || 'unknown';
        byDealer[key] = byDealer[key] || {
            dealerName: po.dealerId ? po.dealerId.businessName : 'Unknown dealer',
            orderCount: 0,
            totalQuantity: 0,
            totalPurchaseValue: 0,
            lastOrderDate: null,
        };
        byDealer[key].orderCount += 1;
        byDealer[key].totalQuantity += (po.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
        byDealer[key].totalPurchaseValue += po.totalAmount || 0;
        if (!byDealer[key].lastOrderDate || new Date(po.orderDate) > new Date(byDealer[key].lastOrderDate)) byDealer[key].lastOrderDate = po.orderDate;
    });

    return Object.values(byDealer)
        .map((d: any) => ({ ...d, averageOrderValue: d.orderCount ? d.totalPurchaseValue / d.orderCount : 0 }))
        .sort((a: any, b: any) => b.totalPurchaseValue - a.totalPurchaseValue);
}
// } Dealer Performance Report

// Product Performance Report {
export const getProductPerformanceReport = async (filters: any = {}): Promise<any[]> => {
    const orders = await fetchSaleOrders(filters);
    const byProduct: Record<string, any> = {};

    orders.forEach((po: any) => {
        (po.items || []).forEach((item: any) => {
            const key = getStr(item.productId) || getStr(item.sku) || item.productName;
            byProduct[key] = byProduct[key] || { productId: item.productId, productName: item.productName, sku: item.sku, unitsSold: 0, revenue: 0 };
            byProduct[key].unitsSold += item.quantity || 0;
            byProduct[key].revenue += item.total || 0;
        });
    });

    const productIds = Object.values(byProduct).map((p: any) => p.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).populate([{ path: 'categoryId', model: 'categories' }]).lean();
    const productById: Record<string, any> = {};
    products.forEach((p: any) => productById[getStr(p._id)] = p);

    return Object.values(byProduct)
        .map((p: any) => {
            const product = productById[getStr(p.productId)];
            return {
                productName: p.productName,
                sku: p.sku,
                categoryName: product?.categoryId ? product.categoryId.name : '-',
                unitsSold: p.unitsSold,
                revenue: +p.revenue.toFixed(2),
                averageSellingPrice: p.unitsSold ? +(p.revenue / p.unitsSold).toFixed(2) : 0,
                currentStock: product?.productType === 'SIMPLE' ? (product?.inventory?.globalStock ?? 0) : (product?.variations || []).reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0),
            };
        })
        .sort((a: any, b: any) => b.revenue - a.revenue);
}
// } Product Performance Report

// Inventory Report - current snapshot only. This app has no stock-movement
// ledger (opening/purchases/adjustments), so unlike the full spec this only
// reports what's actually trackable today: current stock vs. threshold {
export const getInventoryReport = async (filters: any = {}): Promise<any[]> => {
    const query: any = { deletedAt: null };
    if (filters.categoryId) query.categoryId = filters.categoryId;

    const products = await Product.find(query).populate([{ path: 'categoryId', model: 'categories' }]).sort({ name: 1 }).lean();

    const rows = products.map((p: any) => {
        const stock = p.productType === 'SIMPLE' ? (p.inventory?.globalStock ?? 0) : (p.variations || []).reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0);
        const threshold = p.productType === 'SIMPLE' ? (p.inventory?.lowStockThreshold ?? 0) : (p.variations || []).reduce((m: number, v: any) => Math.max(m, v.lowStockThreshold || 0), 0);
        const status = stock <= 0 ? 'OUT_OF_STOCK' : (stock <= threshold ? 'LOW_STOCK' : 'IN_STOCK');
        return {
            sku: p.baseSku || '-',
            productName: p.name,
            categoryName: p.categoryId ? p.categoryId.name : '-',
            currentStock: stock,
            lowStockThreshold: threshold,
            stockStatus: status,
        };
    });

    if (filters.stockStatus) return rows.filter((r: any) => r.stockStatus === filters.stockStatus);
    return rows;
}
// } Inventory Report

// Monthly Report - trailing 12 months {
export const getMonthlyReport = async (): Promise<any[]> => {
    const months: { label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            start: new Date(d.getFullYear(), d.getMonth(), 1),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
        });
    }

    const rows = [];
    for (const month of months) {
        const orders = await PurchaseOrder.find({ deletedAt: null, orderDate: { $gte: month.start, $lte: month.end } }).lean();
        const saleOrders = orders.filter((o: any) => SALE_STATUSES.includes(o.status));
        const delivered = orders.filter((o: any) => o.status === 'DELIVERED');
        const unitsSold = saleOrders.reduce((sum: number, o: any) => sum + (o.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0), 0);
        const sales = saleOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

        const newDealers = await Dealer.countDocuments({ deletedAt: null, createdAt: { $gte: month.start, $lte: month.end } });
        const approvedDealers = await Dealer.countDocuments({ deletedAt: null, approvalStatus: 'APPROVED', approvedAt: { $gte: month.start, $lte: month.end } });

        rows.push({
            month: month.label,
            orders: orders.length,
            sales: +sales.toFixed(2),
            unitsSold,
            newDealers,
            approvedDealers,
            deliveredOrders: delivered.length,
        });
    }

    return rows;
}
// } Monthly Report
