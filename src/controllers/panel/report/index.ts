// Models
import { Dealer } from '../../../models/dealer';
import { Category } from '../../../models/category';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, buildWorkbookBuffer } from '../../../utils';
import * as Helper from './helper';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

const downloadWorkbook = (res: any, rows: any[], sheetName: string, filenamePrefix: string): void => {
    const buffer = buildWorkbookBuffer(rows, sheetName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenamePrefix}-${Date.now()}.xlsx"`);
    return res.send(buffer);
}

export default class ReportController {

    static page(req: any, res: any): void {
        return res.render('panel/report/index', { title: 'Reports', layout: 'panel/layout/main' });
    }

    // Sales Report {
    static async salesPage(req: any, res: any): Promise<void> {
        try {
            const dealers = await Dealer.find({ deletedAt: null }).select('_id businessName').sort({ businessName: 1 }).lean();
            const rows = await Helper.getSalesReport(req.query || {});

            const summary = rows.reduce((acc: any, r: any) => {
                acc.grossSales += r.quantity * r.unitPrice;
                acc.discount += r.discount || 0;
                acc.tax += r.tax || 0;
                acc.netSales += r.total || 0;
                return acc;
            }, { grossSales: 0, discount: 0, tax: 0, netSales: 0 });
            summary.orderCount = new Set(rows.map((r: any) => r.poNumber)).size;
            summary.itemCount = rows.length;

            return res.render('panel/report/sales', { title: 'Sales Report', layout: 'panel/layout/main', rows, summary, dealers, filters: req.query || {} });
        } catch (e: any) {
            logError(e, '[PANEL-REPORT-SALES] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/reports');
        }
    }

    static async salesExport(req: any, res: any): Promise<void> {
        const rows = await Helper.getSalesReport(req.query || {});
        const exportRows = rows.map((r: any) => ({
            'PO Number': r.poNumber, 'Dealer': r.dealerName, 'Order Date': r.orderDate ? new Date(r.orderDate).toISOString().slice(0, 10) : '',
            'Product': r.productName, 'SKU': r.sku, 'Quantity': r.quantity, 'Unit Price': r.unitPrice, 'Discount': r.discount, 'Tax': r.tax, 'Total': r.total, 'Status': r.status,
        }));
        return downloadWorkbook(res, exportRows, 'Sales', 'sales-report');
    }
    // } Sales Report

    // Dealer Performance Report {
    static async dealerPerformancePage(req: any, res: any): Promise<void> {
        try {
            const rows = await Helper.getDealerPerformanceReport(req.query || {});
            return res.render('panel/report/dealer-performance', { title: 'Dealer Performance Report', layout: 'panel/layout/main', rows, filters: req.query || {} });
        } catch (e: any) {
            logError(e, '[PANEL-REPORT-DEALER-PERFORMANCE] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/reports');
        }
    }

    static async dealerPerformanceExport(req: any, res: any): Promise<void> {
        const rows = await Helper.getDealerPerformanceReport(req.query || {});
        const exportRows = rows.map((r: any) => ({
            'Dealer': r.dealerName, 'Number of Orders': r.orderCount, 'Total Quantity': r.totalQuantity,
            'Total Purchase Value': r.totalPurchaseValue, 'Average Order Value': +r.averageOrderValue.toFixed(2),
            'Last Order Date': r.lastOrderDate ? new Date(r.lastOrderDate).toISOString().slice(0, 10) : '',
        }));
        return downloadWorkbook(res, exportRows, 'Dealer Performance', 'dealer-performance-report');
    }
    // } Dealer Performance Report

    // Product Performance Report {
    static async productPerformancePage(req: any, res: any): Promise<void> {
        try {
            const categories = await Category.find({ deletedAt: null }).select('_id name').sort({ name: 1 }).lean();
            const rows = await Helper.getProductPerformanceReport(req.query || {});
            return res.render('panel/report/product-performance', { title: 'Product Performance Report', layout: 'panel/layout/main', rows, categories, filters: req.query || {} });
        } catch (e: any) {
            logError(e, '[PANEL-REPORT-PRODUCT-PERFORMANCE] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/reports');
        }
    }

    static async productPerformanceExport(req: any, res: any): Promise<void> {
        const rows = await Helper.getProductPerformanceReport(req.query || {});
        const exportRows = rows.map((r: any) => ({
            'Product': r.productName, 'SKU': r.sku, 'Category': r.categoryName, 'Units Sold': r.unitsSold,
            'Revenue': r.revenue, 'Current Stock': r.currentStock, 'Average Selling Price': r.averageSellingPrice,
        }));
        return downloadWorkbook(res, exportRows, 'Product Performance', 'product-performance-report');
    }
    // } Product Performance Report

    // Inventory / Low Stock Report {
    static async inventoryPage(req: any, res: any): Promise<void> {
        try {
            const categories = await Category.find({ deletedAt: null }).select('_id name').sort({ name: 1 }).lean();
            const rows = await Helper.getInventoryReport(req.query || {});
            return res.render('panel/report/inventory', { title: 'Inventory Report', layout: 'panel/layout/main', rows, categories, filters: req.query || {} });
        } catch (e: any) {
            logError(e, '[PANEL-REPORT-INVENTORY] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/reports');
        }
    }

    static async inventoryExport(req: any, res: any): Promise<void> {
        const rows = await Helper.getInventoryReport(req.query || {});
        const exportRows = rows.map((r: any) => ({
            'SKU': r.sku, 'Product': r.productName, 'Category': r.categoryName,
            'Current Stock': r.currentStock, 'Low Stock Threshold': r.lowStockThreshold, 'Stock Status': r.stockStatus,
        }));
        return downloadWorkbook(res, exportRows, 'Inventory', 'inventory-report');
    }
    // } Inventory / Low Stock Report

    // Monthly Report {
    static async monthlyPage(req: any, res: any): Promise<void> {
        try {
            const rows = await Helper.getMonthlyReport();
            return res.render('panel/report/monthly', { title: 'Monthly Report', layout: 'panel/layout/main', rows });
        } catch (e: any) {
            logError(e, '[PANEL-REPORT-MONTHLY] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/reports');
        }
    }

    static async monthlyExport(req: any, res: any): Promise<void> {
        const rows = await Helper.getMonthlyReport();
        const exportRows = rows.map((r: any) => ({
            'Month': r.month, 'Orders': r.orders, 'Sales': r.sales, 'Units Sold': r.unitsSold,
            'New Dealers': r.newDealers, 'Approved Dealers': r.approvedDealers, 'Delivered Orders': r.deliveredOrders,
        }));
        return downloadWorkbook(res, exportRows, 'Monthly', 'monthly-report');
    }
    // } Monthly Report

}
