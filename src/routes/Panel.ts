import { Router } from 'express';
import multer from 'multer';

// Middleware
import panelFlash from '../middleware/PanelFlash';
import panelAuth from '../middleware/PanelAuth';
import panelGuest from '../middleware/PanelGuest';
import panelPermission from '../middleware/PanelPermission';

// Controllers
import AuthController from '../controllers/panel/auth';
import DashboardController from '../controllers/panel/dashboard';
import UserController from '../controllers/panel/user';
import RolePermissionController from '../controllers/panel/role-permission';
import CategoryController from '../controllers/panel/category';
import LoginAuditController from '../controllers/panel/login-audit';
import ActivityLogController from '../controllers/panel/activity-log';
import AttributeController from '../controllers/panel/attribute';
import AttributeValueController from '../controllers/panel/attribute-value';
import AttributeSetController from '../controllers/panel/attribute-set';
import ProductController from '../controllers/panel/product';
import SettingController from '../controllers/panel/setting';
import DealerController from '../controllers/panel/dealer';
import PurchaseOrderController from '../controllers/panel/purchase-order';
import ProductImportExportController from '../controllers/panel/product-import-export';
import ProductStockUpdateController from '../controllers/panel/product-stock-update';
import ReportController from '../controllers/panel/report';
import FaqController from '../controllers/panel/faq';

const route = Router();
// in-memory only - the uploaded spreadsheet is parsed and discarded, never persisted as a media asset
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

//--------------------------------------------------------------

route.use(panelFlash);

route.get('/', (req: any, res: any) => res.redirect('/panel/dashboard'));

// Auth (guest only) {
route.get('/login', panelGuest, AuthController.loginPage);
route.post('/login', panelGuest, AuthController.login);

route.get('/forgot-password', panelGuest, AuthController.forgotPasswordPage);
route.post('/forgot-password', panelGuest, AuthController.forgotPassword);
route.get('/forgot-password/verify-otp', panelGuest, AuthController.verifyOtpPage);
route.post('/forgot-password/verify-otp', panelGuest, AuthController.verifyOtp);
route.get('/forgot-password/reset', panelGuest, AuthController.resetPasswordPage);
route.post('/forgot-password/reset', panelGuest, AuthController.resetPassword);
// } Auth (guest only)

route.post('/logout', AuthController.logout);

// Everything below requires an authenticated panel session {
route.use(panelAuth);

route.get('/dashboard', panelPermission('DASHBOARD.VIEW'), DashboardController.index);

route.get('/change-password', AuthController.changePasswordPage);
route.post('/change-password', AuthController.changePassword);

// Users {
route.get('/users', panelPermission('USER.VIEW'), UserController.list);
route.get('/users/create', panelPermission('USER.CREATE'), UserController.createPage);
route.post('/users/create', panelPermission('USER.CREATE'), UserController.create);
route.get('/users/:id', panelPermission('USER.VIEW'), UserController.viewPage);
route.get('/users/:id/edit', panelPermission('USER.UPDATE'), UserController.editPage);
route.post('/users/:id/edit', panelPermission('USER.UPDATE'), UserController.update);
route.post('/users/:id/toggle-active', panelPermission('USER.STATUS'), UserController.toggleActive);
route.post('/users/:id/delete', panelPermission('USER.DELETE'), UserController.delete);
// } Users

// Roles & Permissions {
route.get('/roles', panelPermission('ROLE-PERMISSION.VIEW'), RolePermissionController.list);
route.get('/roles/create', panelPermission('ROLE-PERMISSION.CREATE'), RolePermissionController.createPage);
route.post('/roles/create', panelPermission('ROLE-PERMISSION.CREATE'), RolePermissionController.create);
route.get('/roles/:id/edit', panelPermission('ROLE-PERMISSION.UPDATE'), RolePermissionController.editPage);
route.post('/roles/:id/edit', panelPermission('ROLE-PERMISSION.UPDATE'), RolePermissionController.update);
route.post('/roles/:id/delete', panelPermission('ROLE-PERMISSION.DELETE'), RolePermissionController.delete);
// } Roles & Permissions

// Categories (self-referencing 3-level tree - Category > Subcategory > Sub-subcategory) {
route.get('/categories', panelPermission('CATEGORY.VIEW'), CategoryController.list);
route.get('/categories/create', panelPermission('CATEGORY.CREATE'), CategoryController.createPage);
route.post('/categories/create', panelPermission('CATEGORY.CREATE'), CategoryController.create);
route.get('/categories/:id/edit', panelPermission('CATEGORY.UPDATE'), CategoryController.editPage);
route.post('/categories/:id/edit', panelPermission('CATEGORY.UPDATE'), CategoryController.update);
route.post('/categories/:id/delete', panelPermission('CATEGORY.DELETE'), CategoryController.delete);
// } Categories

// Login Audit {
route.get('/login-audit', panelPermission('LOGIN-AUDIT.VIEW'), LoginAuditController.list);
// } Login Audit

// Activity Log {
route.get('/activity-log', panelPermission('ACTIVITY-LOG.VIEW'), ActivityLogController.list);
// } Activity Log

// Attributes {
route.get('/attributes', panelPermission('ATTRIBUTE.VIEW'), AttributeController.list);
route.get('/attributes/create', panelPermission('ATTRIBUTE.CREATE'), AttributeController.createPage);
route.post('/attributes/create', panelPermission('ATTRIBUTE.CREATE'), AttributeController.create);
route.get('/attributes/:id/edit', panelPermission('ATTRIBUTE.VIEW'), AttributeController.editPage);
route.post('/attributes/:id/edit', panelPermission('ATTRIBUTE.UPDATE'), AttributeController.update);
route.post('/attributes/:id/delete', panelPermission('ATTRIBUTE.DELETE'), AttributeController.delete);

route.post('/attributes/:attributeId/values/create', panelPermission('ATTRIBUTE.UPDATE'), AttributeValueController.create);
route.get('/attributes/:attributeId/values/:valueId/edit', panelPermission('ATTRIBUTE.UPDATE'), AttributeValueController.editPage);
route.post('/attributes/:attributeId/values/:valueId/edit', panelPermission('ATTRIBUTE.UPDATE'), AttributeValueController.update);
route.post('/attributes/:attributeId/values/:valueId/delete', panelPermission('ATTRIBUTE.UPDATE'), AttributeValueController.delete);
// } Attributes

// Attribute Sets {
route.get('/attribute-sets', panelPermission('ATTRIBUTE-SET.VIEW'), AttributeSetController.list);
route.get('/attribute-sets/create', panelPermission('ATTRIBUTE-SET.CREATE'), AttributeSetController.createPage);
route.post('/attribute-sets/create', panelPermission('ATTRIBUTE-SET.CREATE'), AttributeSetController.create);
route.get('/attribute-sets/:id/edit', panelPermission('ATTRIBUTE-SET.UPDATE'), AttributeSetController.editPage);
route.post('/attribute-sets/:id/edit', panelPermission('ATTRIBUTE-SET.UPDATE'), AttributeSetController.update);
route.post('/attribute-sets/:id/delete', panelPermission('ATTRIBUTE-SET.DELETE'), AttributeSetController.delete);
// } Attribute Sets

// Products {
route.get('/products', panelPermission('PRODUCT.VIEW'), ProductController.list);
route.get('/products/create', panelPermission('PRODUCT.CREATE'), ProductController.createPage);
route.post('/products/create', panelPermission('PRODUCT.CREATE'), ProductController.create);

// Product Import / Export - registered before the /products/:id routes below so
// "import-export"/"export" never gets swallowed by the :id param {
route.get('/products/import-export', panelPermission('PRODUCT.IMPORT'), ProductImportExportController.page);
route.get('/products/import-export/sample-template', panelPermission('PRODUCT.IMPORT'), ProductImportExportController.downloadSampleTemplate);
route.get('/products/export', panelPermission('PRODUCT.EXPORT'), ProductImportExportController.export);
route.post('/products/import-export/preview', panelPermission('PRODUCT.IMPORT'), importUpload.single('file'), ProductImportExportController.previewImport);
route.post('/products/import-export/confirm', panelPermission('PRODUCT.IMPORT'), ProductImportExportController.confirmImport);
route.get('/products/import-export/error-report', panelPermission('PRODUCT.IMPORT'), ProductImportExportController.downloadErrorReport);
// } Product Import / Export

// Product Stock & Price Update - also registered before /products/:id {
route.get('/products/stock-update', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.page);
route.get('/products/stock-update/template', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.downloadTemplate);
route.post('/products/stock-update/preview', panelPermission('PRODUCT.UPDATE'), importUpload.single('file'), ProductStockUpdateController.previewUpdate);
route.post('/products/stock-update/confirm', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.confirmUpdate);
route.get('/products/stock-update/error-report', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.downloadErrorReport);
route.get('/products/stock-update/full-template', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.downloadFullTemplate);
route.post('/products/stock-update/full-preview', panelPermission('PRODUCT.UPDATE'), importUpload.single('file'), ProductStockUpdateController.previewFullUpdate);
route.post('/products/stock-update/full-confirm', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.confirmFullUpdate);
route.get('/products/stock-update/full-error-report', panelPermission('PRODUCT.UPDATE'), ProductStockUpdateController.downloadFullErrorReport);
// } Product Stock & Price Update

route.get('/products/:id', panelPermission('PRODUCT.VIEW'), ProductController.viewPage);
route.get('/products/:id/edit', panelPermission('PRODUCT.UPDATE'), ProductController.editPage);
route.post('/products/:id/edit', panelPermission('PRODUCT.UPDATE'), ProductController.update);
route.post('/products/:id/delete', panelPermission('PRODUCT.DELETE'), ProductController.delete);
route.post('/products/:id/duplicate', panelPermission('PRODUCT.CREATE'), ProductController.duplicate);
route.post('/products/:id/status', panelPermission('PRODUCT.UPDATE'), ProductController.setStatus);
// } Products

// Dealers {
route.get('/dealers', panelPermission('DEALER.VIEW'), DealerController.list);
route.get('/dealers/create', panelPermission('DEALER.CREATE'), DealerController.createPage);
route.post('/dealers/create', panelPermission('DEALER.CREATE'), DealerController.create);
route.get('/dealers/:id', panelPermission('DEALER.VIEW'), DealerController.viewPage);
route.get('/dealers/:id/edit', panelPermission('DEALER.UPDATE'), DealerController.editPage);
route.post('/dealers/:id/edit', panelPermission('DEALER.UPDATE'), DealerController.update);
route.post('/dealers/:id/delete', panelPermission('DEALER.DELETE'), DealerController.delete);
route.post('/dealers/:id/approval-status', panelPermission('DEALER.UPDATE'), DealerController.setApprovalStatus);

route.post('/dealers/:id/pricing/create', panelPermission('DEALER.UPDATE'), DealerController.createPricing);
route.post('/dealers/:id/pricing/:pricingId/delete', panelPermission('DEALER.UPDATE'), DealerController.deletePricing);

route.post('/dealers/:id/discounts/create', panelPermission('DEALER.UPDATE'), DealerController.createDiscount);
route.post('/dealers/:id/discounts/:discountId/delete', panelPermission('DEALER.UPDATE'), DealerController.deleteDiscount);
// } Dealers

// Purchase Orders {
route.get('/purchase-orders', panelPermission('PURCHASE-ORDER.VIEW'), PurchaseOrderController.list);
route.get('/purchase-orders/create', panelPermission('PURCHASE-ORDER.CREATE'), PurchaseOrderController.createPage);
route.post('/purchase-orders/create', panelPermission('PURCHASE-ORDER.CREATE'), PurchaseOrderController.create);
route.get('/purchase-orders/:id', panelPermission('PURCHASE-ORDER.VIEW'), PurchaseOrderController.viewPage);
route.get('/purchase-orders/:id/edit', panelPermission('PURCHASE-ORDER.UPDATE'), PurchaseOrderController.editPage);
route.post('/purchase-orders/:id/edit', panelPermission('PURCHASE-ORDER.UPDATE'), PurchaseOrderController.update);
route.post('/purchase-orders/:id/delete', panelPermission('PURCHASE-ORDER.DELETE'), PurchaseOrderController.delete);
route.post('/purchase-orders/:id/review', panelPermission('PURCHASE-ORDER.UPDATE'), PurchaseOrderController.review);
route.post('/purchase-orders/:id/status', panelPermission('PURCHASE-ORDER.CHANGE-STATUS'), PurchaseOrderController.changeStatus);

route.post('/purchase-orders/:id/assign-package-manager', panelPermission('ASSIGN-PACKAGE-MANAGER.ASSIGN'), PurchaseOrderController.assignPackageManager);
route.post('/purchase-orders/:id/assign-delivery-manager', panelPermission('ASSIGN-DELIVERY-MANAGER.ASSIGN'), PurchaseOrderController.assignDeliveryManager);

route.post('/purchase-orders/:id/delivery-images', panelPermission('DELIVERY-PICTURE.UPLOAD'), PurchaseOrderController.uploadDeliveryImage);
route.post('/purchase-orders/:id/delivery-images/:imageId/delete', panelPermission('DELIVERY-PICTURE.UPLOAD'), PurchaseOrderController.deleteDeliveryImage);
// } Purchase Orders

// Reports {
route.get('/reports', panelPermission('REPORT.VIEW'), ReportController.page);

route.get('/reports/sales', panelPermission('REPORT.VIEW'), ReportController.salesPage);
route.get('/reports/sales/export', panelPermission('REPORT.EXPORT'), ReportController.salesExport);

route.get('/reports/dealer-performance', panelPermission('REPORT.VIEW'), ReportController.dealerPerformancePage);
route.get('/reports/dealer-performance/export', panelPermission('REPORT.EXPORT'), ReportController.dealerPerformanceExport);

route.get('/reports/product-performance', panelPermission('REPORT.VIEW'), ReportController.productPerformancePage);
route.get('/reports/product-performance/export', panelPermission('REPORT.EXPORT'), ReportController.productPerformanceExport);

route.get('/reports/inventory', panelPermission('REPORT.VIEW'), ReportController.inventoryPage);
route.get('/reports/inventory/export', panelPermission('REPORT.EXPORT'), ReportController.inventoryExport);

route.get('/reports/monthly', panelPermission('REPORT.VIEW'), ReportController.monthlyPage);
route.get('/reports/monthly/export', panelPermission('REPORT.EXPORT'), ReportController.monthlyExport);
// } Reports

// FAQs (dealer app Help & Support) {
route.get('/faqs', panelPermission('FAQ.VIEW'), FaqController.list);
route.get('/faqs/create', panelPermission('FAQ.CREATE'), FaqController.createPage);
route.post('/faqs/create', panelPermission('FAQ.CREATE'), FaqController.create);
route.get('/faqs/:id/edit', panelPermission('FAQ.UPDATE'), FaqController.editPage);
route.post('/faqs/:id/edit', panelPermission('FAQ.UPDATE'), FaqController.update);
route.post('/faqs/:id/delete', panelPermission('FAQ.DELETE'), FaqController.delete);
// } FAQs

// Settings (Branding) {
route.get('/settings', panelPermission('SETTING.VIEW'), SettingController.editPage);
route.post('/settings', panelPermission('SETTING.UPDATE'), SettingController.update);
route.post('/settings/bulk-price-adjustment', panelPermission('SETTING.UPDATE'), SettingController.bulkPriceAdjustment);
// } Settings (Branding)

// 404
route.all('*', (req: any, res: any) => {
    return res.status(404).render('panel/error/404', { title: 'Not Found', layout: 'panel/layout/main' });
});

//--------------------------------------------------------------
export default route;
