// Models
import { Product } from '../../../models/product';
import { Category } from '../../../models/category';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, formatKey } from '../../../utils';
import Core from '../../../core';
import MediaManager from '../../../services/media';
import * as Helper from './helper';
import { buildCategoryTemplate } from './templateHelper';
import { downloadProductImage } from './imageHelper';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

const SESSION_KEY = 'productImportStaging';

export default class ProductImportExportController {

    static async page(req: any, res: any): Promise<void> {
        const categories = await Category.find({ status: 'ACTIVE', deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

        return res.render('panel/product-import-export/index', {
            title: 'Product Import / Export',
            layout: 'panel/layout/main',
            columns: Helper.IMPORT_COLUMNS,
            statuses: Helper.VALID_STATUSES,
            categories,
        });
    }

    // Export - Simple products export as one row; Variable products export as one row
    // per variation (sharing a Product Group), with every category's resolved
    // attributes folded in as extra columns (blank where a product's own category
    // doesn't have that attribute) {
    static async export(req: any, res: any): Promise<void> {
        try {
            const query: any = { deletedAt: null };
            if (!empty(req.query?.categoryId)) query.categoryId = req.query.categoryId;
            if (!empty(req.query?.status)) query.status = req.query.status;

            const products = await Product.find(query).populate([{ path: 'categoryId', model: 'categories' }, { path: 'subcategoryId', model: 'categories' }]).sort({ createdAt: -1 }).lean();

            // resolve (and cache) the attribute schema for every distinct category/subcategory
            // pair seen, and build the union of attribute names so every exported row gets a
            // stable, complete set of columns {
            const resolvedCache: Record<string, any[]> = {};
            const attributeNamesSeen: string[] = [];

            for (const p of products) {
                if (empty(p.categoryId)) continue;
                const key = `${getStr(p.categoryId._id)}:${p.subcategoryId ? getStr(p.subcategoryId._id) : ''}`;
                if (!(key in resolvedCache)) {
                    const { attributes } = await Core.Attribute.resolve([p.categoryId._id, p.subcategoryId ? p.subcategoryId._id : null]);
                    resolvedCache[key] = attributes;
                    attributes.forEach((a: any) => { if (!attributeNamesSeen.includes(a.name)) attributeNamesSeen.push(a.name); });
                }
            }
            // } resolve (and cache) the attribute schema

            const formatProductAttributeValue = (attr: any, product: any): string => {
                const values = (product.attributes || []).filter((a: any) => getStr(a.attributeId) === attr.attributeId);
                if (!values.length) return '';
                if (attr.inputType === 'MULTI_SELECT') {
                    return values.map((v: any) => (attr.allowedValues.find((av: any) => av.id === getStr(v.attributeValueId)) || {}).value).filter(Boolean).join(', ');
                }
                const v = values[0];
                if (attr.inputType === 'SELECT' || attr.inputType === 'COLOR') return (attr.allowedValues.find((av: any) => av.id === getStr(v.attributeValueId)) || {}).value || '';
                if (attr.inputType === 'BOOLEAN') return v.textValue === 'true' ? 'Yes' : (v.textValue === 'false' ? 'No' : '');
                if (attr.inputType === 'NUMBER' || attr.inputType === 'MEASUREMENT') return !empty(v.numericValue) ? v.numericValue : '';
                return v.textValue || '';
            }

            const formatVariationAttributeValue = (attr: any, variation: any): string => {
                const match = (variation.attributeValues || []).find((av: any) => getStr(av.attributeId) === attr.attributeId);
                if (!match) return '';
                return (attr.allowedValues.find((av: any) => av.id === getStr(match.attributeValueId)) || {}).value || '';
            }

            const rows: any[] = [];
            for (const p of products) {
                const resolved = p.categoryId ? (resolvedCache[`${getStr(p.categoryId._id)}:${p.subcategoryId ? getStr(p.subcategoryId._id) : ''}`] || []) : [];

                const baseRow = {
                    'Product Group': getStr(p._id),
                    'Product Type': p.productType || '',
                    'Product Name': p.name || '',
                    'Category': p.categoryId ? p.categoryId.name : '',
                    'Subcategory': p.subcategoryId ? p.subcategoryId.name : '',
                    'Brand': p.brand || '',
                    'Description': p.description || '',
                    'Low Stock Threshold': p.inventory?.lowStockThreshold ?? 0,
                    'Status': p.status || '',
                    'Created At': p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
                };

                const primaryImage = (p.images || []).find((img: any) => img.isPrimary) || (p.images || [])[0];
                const productImageUrl = primaryImage ? MediaManager.Product.get(primaryImage.image) : '';

                if (p.productType === 'VARIABLE' && (p.variations || []).length) {
                    p.variations.forEach((v: any) => {
                        const row: any = {
                            'Product Group': baseRow['Product Group'], 'SKU': v.sku || '', 'Product Type': baseRow['Product Type'], 'Product Name': baseRow['Product Name'],
                            'Category': baseRow['Category'], 'Subcategory': baseRow['Subcategory'], 'Brand': baseRow['Brand'], 'Description': baseRow['Description'],
                            'Price': Core.Attribute.getEffectivePrice(p, v) ?? '', 'Sale Price': Core.Attribute.getEffectiveSalePrice(p, v) ?? '', 'Stock': v.stockQuantity ?? 0,
                            'Low Stock Threshold': baseRow['Low Stock Threshold'], 'Status': baseRow['Status'], 'Created At': baseRow['Created At'],
                            'Image URL': v.image ? MediaManager.Product.get(v.image) : productImageUrl,
                        };
                        attributeNamesSeen.forEach((name) => {
                            const attr = resolved.find((a: any) => a.name === name);
                            row[name] = attr ? (attr.isVariationAttribute ? formatVariationAttributeValue(attr, v) : formatProductAttributeValue(attr, p)) : '';
                        });
                        rows.push(row);
                    });
                } else {
                    const row: any = {
                        'Product Group': baseRow['Product Group'], 'SKU': p.baseSku || '', 'Product Type': baseRow['Product Type'], 'Product Name': baseRow['Product Name'],
                        'Category': baseRow['Category'], 'Subcategory': baseRow['Subcategory'], 'Brand': baseRow['Brand'], 'Description': baseRow['Description'],
                        'Price': p.pricing?.price ?? '', 'Sale Price': p.pricing?.salePrice ?? '', 'Stock': p.inventory?.globalStock ?? 0,
                        'Low Stock Threshold': baseRow['Low Stock Threshold'], 'Status': baseRow['Status'], 'Created At': baseRow['Created At'],
                        'Image URL': productImageUrl,
                    };
                    attributeNamesSeen.forEach((name) => {
                        const attr = resolved.find((a: any) => a.name === name);
                        row[name] = attr ? formatProductAttributeValue(attr, p) : '';
                    });
                    rows.push(row);
                }
            }

            const buffer = Helper.buildWorkbookBuffer(rows, 'Products');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="products-export-${Date.now()}.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-EXPORT] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/import-export');
        }
    }
    // } Export

    // Download a category-wise sample template (Instructions + dropdown-backed Products
    // sheet, pre-filled with a couple of worked examples) - modeled on the reference
    // Tablets.xlsx the user supplied {
    static async downloadSampleTemplate(req: any, res: any): Promise<void> {
        try {
            const categoryId = req.query?.categoryId;
            if (empty(categoryId)) throw new Error('Please choose a category.');

            const category: any = await Category.findOne({ _id: categoryId, deletedAt: null }).lean();
            if (empty(category)) throw new Error('Category not found.');

            const subcategories = await Category.find({ parentId: categoryId, status: 'ACTIVE', deletedAt: null }).select('name').sort({ name: 1 }).lean();
            const { attributes } = await Core.Attribute.resolve([categoryId]);

            const buffer = await buildCategoryTemplate({ categoryName: category.name, subcategories, attributes });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${formatKey(category.name, '-', false) || 'category'}-import-template.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-IMPORT-SAMPLE-TEMPLATE] -');
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/import-export');
        }
    }
    // } Download a category-wise sample template

    // Import: preview (parse + validate, stage in session, nothing written to the DB yet) {
    static async previewImport(req: any, res: any): Promise<void> {
        try {
            if (empty(req.file?.buffer)) throw new Error('Please choose a file to upload.');

            const rows = Helper.parseWorkbook(req.file.buffer);
            const headerError = Helper.validateHeaders(rows);
            if (headerError) throw new Error(headerError);

            const shapedRows = rows.map((row: any, i: number) => Helper.validateRowShape(row, i + 2)); // +2: row 1 is the header

            // cross-reference against the database (category/subcategory existence, SKU uniqueness) {
            const categories = await Category.find({ deletedAt: null }).select('_id name').lean();
            const categoryByName: any = {};
            categories.forEach((c: any) => categoryByName[c.name.trim().toLowerCase()] = c);

            const subcategories = await Category.find({ parentId: { $ne: null }, deletedAt: null }).select('_id name parentId').lean();
            const subcategoryByKey: any = {};
            subcategories.forEach((s: any) => subcategoryByKey[`${s.parentId}:${s.name.trim().toLowerCase()}`] = s);

            // uniqueness has to cover both a Simple product's baseSku and every Variable
            // product's per-variation sku
            const existingProducts = await Product.find({ deletedAt: null }).select('baseSku variations.sku').lean();
            const existingSkus = new Set<string>();
            existingProducts.forEach((p: any) => {
                if (p.baseSku) existingSkus.add(p.baseSku.toLowerCase());
                (p.variations || []).forEach((v: any) => { if (v.sku) existingSkus.add(v.sku.toLowerCase()); });
            });
            const seenSkusInFile = new Set<string>();

            const resolvedCache: Record<string, any[]> = {};
            const getResolvedAttributes = async (categoryId: any, subcategoryId: any): Promise<any[]> => {
                const key = `${categoryId}:${subcategoryId || ''}`;
                if (!(key in resolvedCache)) resolvedCache[key] = (await Core.Attribute.resolve([categoryId, subcategoryId])).attributes;
                return resolvedCache[key];
            }

            for (const row of shapedRows) {
                const category = categoryByName[row.data.category.trim().toLowerCase()];
                if (row.data.category && !category) {
                    row.errors.push(`Category "${row.data.category}" not found.`);
                    continue;
                }
                if (!category) continue;

                row.data.categoryId = category._id;
                let subcategoryId: any = null;
                if (row.data.subcategory) {
                    const subcategory = subcategoryByKey[`${category._id}:${row.data.subcategory.trim().toLowerCase()}`];
                    if (!subcategory) row.errors.push('Subcategory does not belong to selected category.');
                    else { row.data.subcategoryId = subcategory._id; subcategoryId = subcategory._id; }
                }

                const skuKey = row.data.sku.toLowerCase();
                if (existingSkus.has(skuKey)) row.errors.push('SKU already exists.');
                else if (seenSkusInFile.has(skuKey)) row.errors.push('Duplicate SKU within this file.');
                else seenSkusInFile.add(skuKey);

                const resolvedAttributes = await getResolvedAttributes(category._id, subcategoryId);
                const { attributeRows, errors: attrErrors } = Helper.resolveRowAttributes(resolvedAttributes, row.data.raw);
                row.data.attributeRows = attributeRows;
                row.errors.push(...attrErrors);
                delete row.data.raw; // no longer needed past this point - keep the session payload lean
            }
            // } cross-reference against the database

            // group-level consistency: a Variable product's rows share one Product Group {
            const groupMap: Record<string, any[]> = {};
            shapedRows.forEach((r: any) => {
                const key = r.data.productGroup || r.data.sku;
                groupMap[key] = groupMap[key] || [];
                groupMap[key].push(r);
            });
            Object.values(groupMap).forEach((group: any[]) => {
                if (group.length <= 1) return;
                const productTypes = new Set(group.map((r: any) => r.data.productType));
                const categoryNames = new Set(group.map((r: any) => r.data.category.trim().toLowerCase()));
                if (productTypes.size > 1) group.forEach((r: any) => r.errors.push('All rows sharing a Product Group must have the same Product Type.'));
                if (categoryNames.size > 1) group.forEach((r: any) => r.errors.push('All rows sharing a Product Group must have the same Category.'));
                if (productTypes.size === 1 && [...productTypes][0] === 'SIMPLE') group.forEach((r: any) => r.errors.push('Multiple rows share this Product Group but Product Type is SIMPLE - use VARIABLE, or give each row its own unique Product Group.'));
            });
            // } group-level consistency

            const validRows = shapedRows.filter((r: any) => !r.errors.length);
            const invalidRows = shapedRows.filter((r: any) => r.errors.length);

            req.session[SESSION_KEY] = { validRows, invalidRows, uploadedAt: Date.now() };

            const groupCount = new Set(validRows.map((r: any) => r.data.productGroup || r.data.sku)).size;

            return res.render('panel/product-import-export/preview', {
                title: 'Import Preview',
                layout: 'panel/layout/main',
                totalRows: shapedRows.length,
                validRows,
                invalidRows,
                groupCount,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/import-export');
        }
    }
    // } previewImport

    // Import: confirm (actually create the products staged in the session) - rows
    // sharing a Product Group with Product Type VARIABLE are merged into one product
    // with one variation per row; everything else creates a Simple product {
    static async confirmImport(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const staged = req.session?.[SESSION_KEY];
            if (empty(staged?.validRows)) throw new Error('Nothing to import - please upload a file again.');

            const groups: Record<string, any[]> = {};
            staged.validRows.forEach((row: any) => {
                const key = row.data.productGroup || row.data.sku;
                groups[key] = groups[key] || [];
                groups[key].push(row);
            });

            let created = 0;
            const failures: { row: number; message: string }[] = [];
            const warnings: { row: number; message: string }[] = [];
            const importStartedAt = new Date();

            for (const key of Object.keys(groups)) {
                const groupRows = groups[key];
                const first = groupRows[0].data;

                try {
                    if (first.productType === 'VARIABLE') {
                        // download each row's own "Image URL" (if any) for its variation image,
                        // and reuse the first one found as the product-level primary image too {
                        let productPrimaryImageKey: string | null = null;
                        const variationImageKeys: Record<number, string | null> = {};
                        for (let i = 0; i < groupRows.length; i++) {
                            const url = groupRows[i].data.imageUrl;
                            if (empty(url)) continue;
                            const { key: imageKey, error } = await downloadProductImage(url);
                            if (error) warnings.push({ row: groupRows[i].row, message: `Image: ${error}` });
                            variationImageKeys[i] = imageKey;
                            if (imageKey && !productPrimaryImageKey) productPrimaryImageKey = imageKey;
                        }
                        // }
                        const { productLevel } = Helper.splitAttributeRows(first.attributeRows);

                        // union of every distinct value seen per variation attribute across the group -> variationAttributes[]
                        const variationAttrMap: Record<string, Set<string>> = {};
                        groupRows.forEach((r: any) => {
                            const { variationLevel } = Helper.splitAttributeRows(r.data.attributeRows);
                            variationLevel.forEach((v: any) => {
                                variationAttrMap[v.attributeId] = variationAttrMap[v.attributeId] || new Set<string>();
                                variationAttrMap[v.attributeId].add(getStr(v.attributeValueId));
                            });
                        });
                        const variationAttributes = Object.keys(variationAttrMap).map((attributeId) => ({ attributeId, valueIds: Array.from(variationAttrMap[attributeId]) }));

                        const variations = groupRows.map((r: any, idx: number) => {
                            const { variationLevel } = Helper.splitAttributeRows(r.data.attributeRows);
                            return {
                                sku: r.data.sku,
                                barcode: null,
                                attributeValues: variationLevel.map((v: any) => ({ attributeId: v.attributeId, attributeValueId: v.attributeValueId })),
                                priceMode: 'OVERRIDE',
                                price: r.data.price,
                                salePrice: r.data.salePrice,
                                costPrice: null,
                                stockQuantity: r.data.stock,
                                reservedQuantity: 0,
                                lowStockThreshold: r.data.lowStockThreshold,
                                backorderAllowed: false,
                                image: variationImageKeys[idx] || null,
                                weight: null,
                                length: null,
                                width: null,
                                height: null,
                                status: r.data.status === 'ARCHIVED' ? 'INACTIVE' : (r.data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'),
                                sortOrder: idx,
                            };
                        });

                        const prices = variations.map((v: any) => v.price).filter((p: any) => !empty(p));
                        const totalStock = variations.reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0);

                        await Product.create({
                            name: first.name,
                            baseSku: null,
                            brand: first.brand || null,
                            description: first.description || null,
                            productType: 'VARIABLE',
                            categoryId: first.categoryId || null,
                            subcategoryId: first.subcategoryId || null,
                            images: productPrimaryImageKey ? [{ image: productPrimaryImageKey, imageType: 'MAIN', altText: null, sortOrder: 0, isPrimary: true }] : [],
                            attributes: productLevel,
                            variationAttributes,
                            variations,
                            pricing: { currency: 'INR', price: prices.length ? Math.min(...prices) : null, salePrice: null },
                            inventory: { globalStock: totalStock, lowStockThreshold: first.lowStockThreshold },
                            seo: { slug: Helper.slugify(first.name) },
                            status: first.status,
                            createdBy: panelUser?._id,
                            updatedBy: panelUser?._id,
                        });
                        created += groupRows.length;

                    } else {
                        const { productLevel } = Helper.splitAttributeRows(first.attributeRows);

                        let primaryImageKey: string | null = null;
                        if (!empty(first.imageUrl)) {
                            const { key: imageKey, error } = await downloadProductImage(first.imageUrl);
                            if (error) warnings.push({ row: groupRows[0].row, message: `Image: ${error}` });
                            primaryImageKey = imageKey;
                        }

                        await Product.create({
                            name: first.name,
                            baseSku: first.sku,
                            brand: first.brand || null,
                            description: first.description || null,
                            productType: 'SIMPLE',
                            categoryId: first.categoryId || null,
                            subcategoryId: first.subcategoryId || null,
                            images: primaryImageKey ? [{ image: primaryImageKey, imageType: 'MAIN', altText: null, sortOrder: 0, isPrimary: true }] : [],
                            attributes: productLevel,
                            pricing: { currency: 'INR', price: first.price, salePrice: first.salePrice },
                            inventory: { globalStock: first.stock, lowStockThreshold: first.lowStockThreshold },
                            seo: { slug: Helper.slugify(first.name) },
                            status: first.status,
                            createdBy: panelUser?._id,
                            updatedBy: panelUser?._id,
                        });
                        created += 1;
                    }
                } catch (e: any) {
                    groupRows.forEach((r: any) => failures.push({ row: r.row, message: e?.message || 'Failed to create this row.' }));
                }
            }

            // products this run created -> new-arrival notifications for the ones that went live
            const createdIds = await Product.distinct('_id', { createdBy: panelUser?._id, createdAt: { $gte: importStartedAt } });
            Core.ProductWatch.dispatch(await Core.ProductWatch.capture([]), createdIds);

            delete req.session[SESSION_KEY];

            return res.render('panel/product-import-export/summary', {
                title: 'Import Summary',
                layout: 'panel/layout/main',
                created,
                failures,
                warnings,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/import-export');
        }
    }
    // } confirmImport

    static downloadErrorReport(req: any, res: any): void {
        try {
            const invalidRows = req.session?.[SESSION_KEY]?.invalidRows || [];
            const rows = invalidRows.map((r: any) => ({ Row: r.row, SKU: r.data?.sku || '', 'Product Name': r.data?.name || '', 'Product Group': r.data?.productGroup || '', Errors: (r.errors || []).join(' | ') }));
            const buffer = Helper.buildWorkbookBuffer(rows, 'Errors');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="import-errors-${Date.now()}.xlsx"`);
            return res.send(buffer);
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-IMPORT-ERROR-REPORT] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products/import-export');
        }
    }

}
