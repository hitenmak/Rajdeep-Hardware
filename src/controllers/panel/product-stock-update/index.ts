// Models
import { Product } from '../../../models/product';
import { Category } from '../../../models/category';

// Helpers
import { logError, empty, getStr } from '../../../utils';
import Core from '../../../core';
import MediaManager from '../../../services/media';
import * as Helper from './helper';
import { buildFullUpdateTemplate } from './templateHelper';
import { downloadProductImage } from '../product-import-export/imageHelper';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

const SESSION_KEY = 'productStockUpdateStaging';
const FULL_SESSION_KEY = 'productFullUpdateStaging';

const STOCK_PRICE_TRACKED_FIELDS = [
    { key: 'pricing.price', label: 'Price' },
    { key: 'inventory.globalStock', label: 'Stock' },
    { key: 'inventory.lowStockThreshold', label: 'Low Stock Threshold' },
];
const FULL_UPDATE_TRACKED_FIELDS = [
    { key: 'name', label: 'Name' },
    { key: 'brand', label: 'Brand' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    ...STOCK_PRICE_TRACKED_FIELDS,
];

// snapshot of exactly the fields either bulk-update flow can touch, taken
// *before* the in-place mutations below - both flows fetch `product` as a
// live Mongoose document and mutate it directly, so without this snapshot
// there would be nothing left to diff against once .save() runs {
const snapshotProduct = (product: any): any => ({
    name: product.name, brand: product.brand, description: product.description, status: product.status,
    pricing: { price: product.pricing?.price ?? null },
    inventory: { globalStock: product.inventory?.globalStock ?? null, lowStockThreshold: product.inventory?.lowStockThreshold ?? null },
    variations: (product.variations || []).map((v: any) => ({ sku: v.sku, price: v.price, stockQuantity: v.stockQuantity, lowStockThreshold: v.lowStockThreshold })),
});

// diffs the before-snapshot against the now-saved product and writes one
// activity log entry per product actually changed - this is what was
// entirely missing before: neither bulk-update flow logged anything at all {
const logProductChange = async (req: any, before: any, product: any, trackedFields: any[], sourceLabel: string): Promise<void> => {
    const changes = [
        ...Core.ActivityLog.diff(before, product, trackedFields),
        ...Core.ActivityLog.diffVariations(before.variations, product.variations || []),
    ];
    if (!changes.length) return;

    await Core.ActivityLog.log({
        req, module: 'PRODUCT', entityId: product._id, entityLabel: product.name, action: 'UPDATE',
        changes, summary: `Updated via ${sourceLabel} (${changes.length} field${changes.length > 1 ? 's' : ''} changed)`,
    });
}

export default class ProductStockUpdateController {

    static async page(req: any, res: any): Promise<void> {
        const categories = await Category.find({ status: 'ACTIVE', deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

        return res.render('panel/product-stock-update/index', {
            title: 'Bulk Product Update',
            layout: 'panel/layout/main',
            categories,
            columns: Helper.TEMPLATE_COLUMNS,
            fullColumns: Helper.FULL_TEMPLATE_BASE_COLUMNS,
        });
    }

    // downloads every product in the chosen category, one row per SKU (a Simple
    // product's baseSku, or one row per Variable product's variation sku), pre-filled
    // with its current Price/Stock/Low Stock Threshold so the admin only has
    // to change the numbers they actually want to update {
    static async downloadTemplate(req: any, res: any): Promise<void> {
        try {
            const categoryId = req.query?.categoryId;
            if (empty(categoryId)) throw new Error('Please choose a category.');

            const category: any = await Category.findOne({ _id: categoryId, deletedAt: null }).lean();
            if (empty(category)) throw new Error('Category not found.');

            const products = await Product.find({ categoryId, deletedAt: null }).sort({ name: 1 }).lean();
            const { attributes } = await Core.Attribute.resolve([categoryId]);

            const rows: any[] = [];
            products.forEach((p: any) => {
                const primaryImage = (p.images || []).find((img: any) => img.isPrimary) || (p.images || [])[0];
                const productImageUrl = primaryImage ? MediaManager.Product.get(primaryImage.image) : '';

                if (p.productType === 'VARIABLE' && (p.variations || []).length) {
                    p.variations.forEach((v: any) => {
                        rows.push({
                            'SKU': v.sku || '',
                            'Product Name': p.name || '',
                            'Type': 'VARIABLE',
                            'Variation': Helper.combinationLabel(v, attributes),
                            'Price': v.price ?? '',
                            'Stock': v.stockQuantity ?? 0,
                            'Low Stock Threshold': v.lowStockThreshold ?? 0,
                            'Image': v.image ? MediaManager.Product.get(v.image) : productImageUrl,
                        });
                    });
                } else {
                    rows.push({
                        'SKU': p.baseSku || '',
                        'Product Name': p.name || '',
                        'Type': 'SIMPLE',
                        'Variation': '',
                        'Price': p.pricing?.price ?? '',
                        'Stock': p.inventory?.globalStock ?? 0,
                        'Low Stock Threshold': p.inventory?.lowStockThreshold ?? 0,
                        'Image': productImageUrl,
                    });
                }
            });

            const buffer = Helper.buildWorkbookBuffer(rows, 'Stock & Price');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${category.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-stock-price-update.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-STOCK-UPDATE-TEMPLATE] -');
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }
    // } downloadTemplate

    // downloads every product in the chosen category with ALL of its editable details
    // pre-filled (Name/Brand/Description/Status/Price/Stock/Image/attributes) - the
    // "change all details" counterpart to downloadTemplate above {
    static async downloadFullTemplate(req: any, res: any): Promise<void> {
        try {
            const categoryId = req.query?.categoryId;
            if (empty(categoryId)) throw new Error('Please choose a category.');

            const category: any = await Category.findOne({ _id: categoryId, deletedAt: null }).lean();
            if (empty(category)) throw new Error('Category not found.');

            const products = await Product.find({ categoryId, deletedAt: null }).sort({ name: 1 }).lean();
            const { attributes } = await Core.Attribute.resolve([categoryId]);

            const buffer = await buildFullUpdateTemplate({ categoryName: category.name, attributes, products, imageUrlOf: (image: string | null) => MediaManager.Product.get(image) });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${category.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-full-details-update.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-FULL-UPDATE-TEMPLATE] -');
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }
    // } downloadFullTemplate

    // Preview: parse + match every row's SKU against the catalogue (Simple baseSku or a
    // Variable product's variation sku), nothing written to the DB yet {
    static async previewUpdate(req: any, res: any): Promise<void> {
        try {
            if (empty(req.file?.buffer)) throw new Error('Please choose a file to upload.');

            const rows = Helper.parseWorkbook(req.file.buffer);
            const headerError = Helper.validateHeaders(rows);
            if (headerError) throw new Error(headerError);

            const shapedRows = rows.map((row: any, i: number) => Helper.validateRowShape(row, i + 2));

            // build a SKU -> { productId, productType, variationSku, current values } lookup
            // in one pass, so every row can be matched without a per-row DB query {
            const products = await Product.find({ deletedAt: null }).select('name productType baseSku pricing inventory variations.sku variations.price variations.stockQuantity variations.lowStockThreshold').lean();
            const skuMap: Record<string, any> = {};
            products.forEach((p: any) => {
                if (p.baseSku) {
                    skuMap[p.baseSku.toLowerCase()] = {
                        productId: getStr(p._id), productName: p.name, productType: 'SIMPLE', variationSku: null,
                        currentPrice: p.pricing?.price ?? null,
                        currentStock: p.inventory?.globalStock ?? null, currentLowStockThreshold: p.inventory?.lowStockThreshold ?? null,
                    };
                }
                (p.variations || []).forEach((v: any) => {
                    if (!v.sku) return;
                    skuMap[v.sku.toLowerCase()] = {
                        productId: getStr(p._id), productName: p.name, productType: 'VARIABLE', variationSku: v.sku,
                        currentPrice: v.price ?? null,
                        currentStock: v.stockQuantity ?? null, currentLowStockThreshold: v.lowStockThreshold ?? null,
                    };
                });
            });
            // } build SKU lookup

            const seenSkusInFile = new Set<string>();
            shapedRows.forEach((row: any) => {
                const skuKey = row.data.sku.toLowerCase();
                if (!skuKey) return;

                const match = skuMap[skuKey];
                if (!match) { row.errors.push('SKU not found in the catalogue.'); return; }
                if (seenSkusInFile.has(skuKey)) { row.errors.push('Duplicate SKU within this file.'); return; }
                seenSkusInFile.add(skuKey);

                if (!row.data.priceProvided && !row.data.stockProvided && !row.data.lowStockProvided) {
                    row.errors.push('Nothing to update on this row - fill in Price, Stock, or Low Stock Threshold.');
                }

                Object.assign(row.data, match);
            });

            const validRows = shapedRows.filter((r: any) => !r.errors.length);
            const invalidRows = shapedRows.filter((r: any) => r.errors.length);

            req.session[SESSION_KEY] = { validRows, invalidRows, uploadedAt: Date.now() };

            return res.render('panel/product-stock-update/preview', {
                title: 'Stock & Price Update Preview',
                layout: 'panel/layout/main',
                totalRows: shapedRows.length,
                validRows,
                invalidRows,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }
    // } previewUpdate

    // Confirm: apply the staged updates - grouped by product so a Variable product's
    // several variation rows are all applied (and its top-level pricing/stock
    // recomputed) in one save {
    static async confirmUpdate(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const staged = req.session?.[SESSION_KEY];
            if (empty(staged?.validRows)) throw new Error('Nothing to update - please upload a file again.');

            const groups: Record<string, any[]> = {};
            staged.validRows.forEach((row: any) => {
                groups[row.data.productId] = groups[row.data.productId] || [];
                groups[row.data.productId].push(row);
            });

            let updated = 0;
            const failures: { row: number; message: string }[] = [];
            const watch = await Core.ProductWatch.capture(Object.keys(groups));

            for (const productId of Object.keys(groups)) {
                const groupRows = groups[productId];

                try {
                    const product: any = await Product.findOne({ _id: productId, deletedAt: null });
                    if (empty(product)) throw new Error('Product no longer exists.');
                    const before = snapshotProduct(product);

                    if (product.productType === 'VARIABLE') {
                        groupRows.forEach((r: any) => {
                            const variation = (product.variations || []).find((v: any) => v.sku === r.data.variationSku);
                            if (empty(variation)) return;
                            if (r.data.priceProvided) variation.price = r.data.price;
                            if (r.data.stockProvided) variation.stockQuantity = r.data.stock;
                            if (r.data.lowStockProvided) variation.lowStockThreshold = r.data.lowStockThreshold;
                        });

                        const variationPrices = (product.variations || []).map((v: any) => v.price).filter((p: any) => !empty(p));
                        if (variationPrices.length) product.pricing.price = Math.min(...variationPrices);
                        product.inventory.globalStock = (product.variations || []).reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0);
                    } else {
                        const r = groupRows[0].data;
                        if (r.priceProvided) product.pricing.price = r.price;
                        if (r.stockProvided) product.inventory.globalStock = r.stock;
                        if (r.lowStockProvided) product.inventory.lowStockThreshold = r.lowStockThreshold;
                    }

                    product.updatedBy = panelUser?._id;
                    await product.save();
                    await logProductChange(req, before, product, STOCK_PRICE_TRACKED_FIELDS, 'Stock & Price Update import');
                    updated += groupRows.length;
                } catch (e: any) {
                    groupRows.forEach((r: any) => failures.push({ row: r.row, message: e?.message || 'Failed to update this row.' }));
                }
            }

            Core.ProductWatch.dispatch(watch);
            delete req.session[SESSION_KEY];

            return res.render('panel/product-stock-update/summary', {
                title: 'Stock & Price Update Summary',
                layout: 'panel/layout/main',
                updated,
                failures,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }
    // } confirmUpdate

    // Full Details Update: preview (parse + validate + match, stage in session) {
    static async previewFullUpdate(req: any, res: any): Promise<void> {
        try {
            if (empty(req.file?.buffer)) throw new Error('Please choose a file to upload.');

            const rows = Helper.parseWorkbook(req.file.buffer);
            const headerError = Helper.validateHeaders(rows);
            if (headerError) throw new Error(headerError);

            const shapedRows = rows.map((row: any, i: number) => Helper.validateFullRowShape(row, i + 2));

            const products = await Product.find({ deletedAt: null }).select('name brand description status categoryId productType baseSku pricing inventory attributes images variations').lean();
            const skuMap: Record<string, any> = {};
            products.forEach((p: any) => {
                if (p.baseSku) {
                    skuMap[p.baseSku.toLowerCase()] = {
                        productId: getStr(p._id), productName: p.name, productType: 'SIMPLE', variationSku: null, categoryId: p.categoryId,
                        currentPrice: p.pricing?.price ?? null,
                        currentStock: p.inventory?.globalStock ?? null, currentLowStockThreshold: p.inventory?.lowStockThreshold ?? null,
                    };
                }
                (p.variations || []).forEach((v: any) => {
                    if (!v.sku) return;
                    skuMap[v.sku.toLowerCase()] = {
                        productId: getStr(p._id), productName: p.name, productType: 'VARIABLE', variationSku: v.sku, categoryId: p.categoryId,
                        currentPrice: v.price ?? null,
                        currentStock: v.stockQuantity ?? null, currentLowStockThreshold: v.lowStockThreshold ?? null,
                    };
                });
            });

            const resolvedCache: Record<string, any[]> = {};
            const getResolvedAttributes = async (categoryId: any): Promise<any[]> => {
                const key = getStr(categoryId);
                if (!key) return [];
                if (!(key in resolvedCache)) resolvedCache[key] = (await Core.Attribute.resolve([categoryId])).attributes;
                return resolvedCache[key];
            }

            const seenSkusInFile = new Set<string>();
            for (const row of shapedRows) {
                const skuKey = row.data.sku.toLowerCase();
                if (!skuKey) continue;

                const match = skuMap[skuKey];
                if (!match) { row.errors.push('SKU not found in the catalogue.'); continue; }
                if (seenSkusInFile.has(skuKey)) { row.errors.push('Duplicate SKU within this file.'); continue; }
                seenSkusInFile.add(skuKey);

                Object.assign(row.data, match);

                const resolvedAttributes = await getResolvedAttributes(match.categoryId);
                const { attributeRows, errors: attrErrors } = Helper.resolveRowAttributeUpdates(resolvedAttributes, row.data.raw);
                row.data.attributeRows = attributeRows;
                row.errors.push(...attrErrors);
                delete row.data.raw;

                const hasAnyChange = row.data.nameProvided || row.data.brandProvided || row.data.descriptionProvided || row.data.statusProvided
                    || row.data.imageUrlProvided || row.data.priceProvided || row.data.stockProvided || row.data.lowStockProvided
                    || attributeRows.length > 0;
                if (!hasAnyChange) row.errors.push('Nothing to update on this row - fill in at least one field.');
            }

            const validRows = shapedRows.filter((r: any) => !r.errors.length);
            const invalidRows = shapedRows.filter((r: any) => r.errors.length);

            req.session[FULL_SESSION_KEY] = { validRows, invalidRows, uploadedAt: Date.now() };

            return res.render('panel/product-stock-update/full-preview', {
                title: 'Full Details Update Preview',
                layout: 'panel/layout/main',
                totalRows: shapedRows.length,
                validRows,
                invalidRows,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }
    // } previewFullUpdate

    // Full Details Update: confirm - grouped by product so a Variable product's several
    // variation rows are all applied (and its top-level pricing/stock/variationAttributes
    // recomputed) in one save {
    static async confirmFullUpdate(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const staged = req.session?.[FULL_SESSION_KEY];
            if (empty(staged?.validRows)) throw new Error('Nothing to update - please upload a file again.');

            const groups: Record<string, any[]> = {};
            staged.validRows.forEach((row: any) => {
                groups[row.data.productId] = groups[row.data.productId] || [];
                groups[row.data.productId].push(row);
            });

            let updated = 0;
            const failures: { row: number; message: string }[] = [];
            const warnings: { row: number; message: string }[] = [];
            const watch = await Core.ProductWatch.capture(Object.keys(groups));

            for (const productId of Object.keys(groups)) {
                const groupRows = groups[productId];

                try {
                    const product: any = await Product.findOne({ _id: productId, deletedAt: null });
                    if (empty(product)) throw new Error('Product no longer exists.');
                    const before = snapshotProduct(product);

                    // product-level fields shared across every row of the same product
                    // (Name/Brand/Description/Status/Image) - the first row that
                    // actually provided a value wins {
                    const nameRow = groupRows.find((r: any) => r.data.nameProvided);
                    if (nameRow) product.name = nameRow.data.name;
                    const brandRow = groupRows.find((r: any) => r.data.brandProvided);
                    if (brandRow) product.brand = brandRow.data.brand;
                    const descRow = groupRows.find((r: any) => r.data.descriptionProvided);
                    if (descRow) product.description = descRow.data.description;
                    const statusRow = groupRows.find((r: any) => r.data.statusProvided);
                    if (statusRow) product.status = statusRow.data.status;

                    const imageRow = groupRows.find((r: any) => r.data.imageUrlProvided);
                    if (imageRow) {
                        const { key: imageKey, error } = await downloadProductImage(imageRow.data.imageUrl);
                        if (error) warnings.push({ row: imageRow.row, message: `Image: ${error}` });
                        else if (imageKey) product.images = [{ image: imageKey, imageType: 'MAIN', altText: null, sortOrder: 0, isPrimary: true }];
                    }
                    // }

                    if (product.productType === 'VARIABLE') {
                        const productLevelUpdates: any[] = [];
                        groupRows.forEach((r: any) => { productLevelUpdates.push(...Helper.splitAttributeRows(r.data.attributeRows).productLevel); });
                        product.attributes = Helper.applyAttributeValueUpdates(product.attributes, productLevelUpdates);

                        groupRows.forEach((r: any) => {
                            const variation = (product.variations || []).find((v: any) => v.sku === r.data.variationSku);
                            if (empty(variation)) return;

                            if (r.data.priceProvided) variation.price = r.data.price;
                            if (r.data.stockProvided) variation.stockQuantity = r.data.stock;
                            if (r.data.lowStockProvided) variation.lowStockThreshold = r.data.lowStockThreshold;

                            const { variationLevel } = Helper.splitAttributeRows(r.data.attributeRows);
                            variation.attributeValues = Helper.applyAttributeValueUpdates(
                                variation.attributeValues,
                                variationLevel.map((a: any) => ({ attributeId: a.attributeId, attributeValueId: a.attributeValueId })),
                            );
                        });

                        // guard against a variation-attribute edit accidentally creating a duplicate combination {
                        const signatures = (product.variations || []).map((v: any) => (v.attributeValues || []).map((av: any) => `${getStr(av.attributeId)}:${getStr(av.attributeValueId)}`).sort().join('|'));
                        const duplicateSignature = signatures.find((sig: string, i: number) => sig && signatures.indexOf(sig) !== i);
                        if (duplicateSignature) throw new Error('This update would make two variations share the same attribute combination - not saved.');
                        // }

                        const variationAttrMap: Record<string, Set<string>> = {};
                        (product.variations || []).forEach((v: any) => {
                            (v.attributeValues || []).forEach((av: any) => {
                                const key = getStr(av.attributeId);
                                variationAttrMap[key] = variationAttrMap[key] || new Set<string>();
                                variationAttrMap[key].add(getStr(av.attributeValueId));
                            });
                        });
                        product.variationAttributes = Object.keys(variationAttrMap).map((attributeId) => ({ attributeId, valueIds: Array.from(variationAttrMap[attributeId]) }));

                        const variationPrices = (product.variations || []).map((v: any) => v.price).filter((p: any) => !empty(p));
                        if (variationPrices.length) product.pricing.price = Math.min(...variationPrices);
                        product.inventory.globalStock = (product.variations || []).reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0);

                    } else {
                        const r = groupRows[0].data;
                        if (r.priceProvided) product.pricing.price = r.price;
                        if (r.stockProvided) product.inventory.globalStock = r.stock;
                        if (r.lowStockProvided) product.inventory.lowStockThreshold = r.lowStockThreshold;

                        const { productLevel } = Helper.splitAttributeRows(r.attributeRows);
                        product.attributes = Helper.applyAttributeValueUpdates(product.attributes, productLevel);
                    }

                    product.updatedBy = panelUser?._id;
                    await product.save();
                    await logProductChange(req, before, product, FULL_UPDATE_TRACKED_FIELDS, 'Full Details Update import');
                    updated += groupRows.length;
                } catch (e: any) {
                    groupRows.forEach((r: any) => failures.push({ row: r.row, message: e?.message || 'Failed to update this row.' }));
                }
            }

            Core.ProductWatch.dispatch(watch);
            delete req.session[FULL_SESSION_KEY];

            return res.render('panel/product-stock-update/full-summary', {
                title: 'Full Details Update Summary',
                layout: 'panel/layout/main',
                updated,
                failures,
                warnings,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }
    // } confirmFullUpdate

    static downloadFullErrorReport(req: any, res: any): void {
        try {
            const invalidRows = req.session?.[FULL_SESSION_KEY]?.invalidRows || [];
            const rows = invalidRows.map((r: any) => ({ Row: r.row, SKU: r.data?.sku || '', Errors: (r.errors || []).join(' | ') }));
            const buffer = Helper.buildWorkbookBuffer(rows, 'Errors');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="full-details-update-errors-${Date.now()}.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-FULL-UPDATE-ERROR-REPORT] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }

    static downloadErrorReport(req: any, res: any): void {
        try {
            const invalidRows = req.session?.[SESSION_KEY]?.invalidRows || [];
            const rows = invalidRows.map((r: any) => ({ Row: r.row, SKU: r.data?.sku || '', Errors: (r.errors || []).join(' | ') }));
            const buffer = Helper.buildWorkbookBuffer(rows, 'Errors');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="stock-price-update-errors-${Date.now()}.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-STOCK-UPDATE-ERROR-REPORT] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/stock-update');
        }
    }

}
