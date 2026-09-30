import moment from 'moment';

// Models
import { Product } from '../../../models/product';
import { Category } from '../../../models/category';
import { Attribute } from '../../../models/attribute';
import { AttributeValue } from '../../../models/attribute-value';
import { Setting } from '../../../models/setting';
import { ActivityLog } from '../../../models/activity-log';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, getBool, getStr, formatKey } from '../../../utils';
import MediaManager from '../../../services/media';
import Core from '../../../core';
import * as Helper from './helper';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

// curated field list the activity log diffs a Product on - deliberately not
// every schema field (images/attributes/variations content are noisy to
// diff field-by-field); variationCount is a synthetic field added to both
// sides of the diff at the call site, not a real schema path {
const PRODUCT_TRACKED_FIELDS = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'visibility', label: 'Visibility' },
    { key: 'featured', label: 'Featured' },
    { key: 'pricing.price', label: 'Price' },
    { key: 'inventory.globalStock', label: 'Stock' },
    { key: 'inventory.lowStockThreshold', label: 'Low Stock Threshold' },
    { key: 'categoryId', label: 'Category' },
    { key: 'subcategoryId', label: 'Subcategory' },
    { key: 'childCategoryId', label: 'Sub-subcategory' },
    { key: 'variationCount', label: 'Variation Count' },
];
// }

// build the category tree + per-node resolved-attribute-schema embedded into the
// form page. Categories are a self-referencing 3-level tree (level 0/1/2, all in
// one collection) - the form's three cascading selects (category/subcategory/
// sub-subcategory) are driven client-side from `categoryNodes` (a flat id->node
// lookup, each carrying its own `children` ids) and `categoryTree` (just the
// roots, for the first select's initial options) {
const buildCategoryResolutionData = async (currentIds: any[] = []): Promise<any> => {
    const nodes: any[] = await Category.find({ status: 'ACTIVE', deletedAt: null }).select('_id name parentId level attributeSetId allowProductLevelAttributeAdditions').sort({ name: 1 }).lean();

    const seenIds = new Set(nodes.map((n: any) => getStr(n._id)));
    for (const id of (currentIds || [])) {
        if (empty(id) || seenIds.has(getStr(id))) continue;
        const extra: any = await Category.findOne({ _id: id, deletedAt: null }).select('_id name parentId level attributeSetId allowProductLevelAttributeAdditions').lean();
        if (extra) { nodes.push(extra); seenIds.add(getStr(extra._id)); }
    }

    const byId: any = {};
    nodes.forEach((n: any) => {
        byId[getStr(n._id)] = {
            id: getStr(n._id),
            name: n.name,
            level: n.level,
            parentId: n.parentId ? getStr(n.parentId) : null,
            allowProductLevelAttributeAdditions: n.allowProductLevelAttributeAdditions !== false,
            children: [] as string[],
        };
    });

    const roots: any[] = [];
    Object.values(byId).forEach((n: any) => {
        if (n.parentId && byId[n.parentId]) byId[n.parentId].children.push(n.id);
        else if (!n.parentId) roots.push(n);
    });

    // resolve attributes for every node, keyed by that node's own id (the
    // deepest select's value) - its chain is its own root->node ancestry {
    const resolved: any = { '': [] };
    for (const node of Object.values(byId) as any[]) {
        const chain: string[] = [];
        let cursor: any = node;
        while (cursor) { chain.unshift(cursor.id); cursor = cursor.parentId ? byId[cursor.parentId] : null; }
        resolved[node.id] = (await Core.Attribute.resolve(chain)).attributes;
    }
    // }

    const allAttributes = await Attribute.find({ status: 'ACTIVE', deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

    return {
        categoryTree: roots,
        categoryNodes: byId,
        resolvedAttributes: resolved,
        allAttributes: allAttributes.map((a: any) => ({ id: getStr(a._id), name: a.name })),
    };
}
// } build the category tree + resolved-attribute-schema

// Dynamic Pricing Engine integration - a Variable product's per-variation
// rawMaterial (parsed by Helper.parseVariations from the Variations tab, which
// still has its own Raw Material/Weight columns) gets priced from Settings >
// Pricing's current rates right away, so a brand new variation is correctly
// auto-priced from the moment it's saved - not just on the next rate change
// (Core.Pricing.recomputeAllProductPrices handles that part).
//
// The Simple-product-level Raw Material/Weight/Auto Price/Cost Price controls
// were removed from the product form entirely, so there's no form field left
// to derive a Simple product's own rawMaterial from - `existingRawMaterial`
// (the record's current value, or null for a brand new product) is carried
// through untouched instead. {
const applyDynamicPricing = async (body: any, req: any, variations: any[], existingRawMaterial: any = null): Promise<{ simpleRawMaterial: any; simplePrice: number | null }> => {
    const simpleRawMaterial = existingRawMaterial || { type: null, weight: null, autoPriced: true };

    const needsRates = (!empty(simpleRawMaterial.type) && simpleRawMaterial.autoPriced !== false) || variations.some((v: any) => !empty(v?.rawMaterial?.type));
    let simplePrice = !empty(req.body?.price) ? getNum(req.body.price) : null;
    if (!needsRates) return { simpleRawMaterial, simplePrice };

    const settings: any = await Setting.findOne({}).select('pricing').lean();
    const rates = {
        brassRate: settings?.pricing?.brassRate ?? null,
        aluminiumRate: settings?.pricing?.aluminiumRate ?? null,
        defaultMargin: settings?.pricing?.defaultMargin ?? 0,
        tax: settings?.pricing?.tax ?? 0,
    };

    if (!empty(simpleRawMaterial.type) && simpleRawMaterial.autoPriced) {
        const computed = Core.Pricing.calculateMaterialPrice(simpleRawMaterial.type, simpleRawMaterial.weight, rates);
        if (!empty(computed)) simplePrice = computed;
    }

    variations.forEach((v: any) => {
        if (empty(v?.rawMaterial?.type) || v.rawMaterial?.autoPriced === false) return;
        const computed = Core.Pricing.calculateMaterialPrice(v.rawMaterial.type, v.rawMaterial.weight, rates);
        if (!empty(computed)) v.price = computed;
    });

    return { simpleRawMaterial, simplePrice };
}
// } Dynamic Pricing Engine integration

export default class ProductController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { deletedAt: null };
            if (!empty(req.query?.categoryId)) query.categoryId = req.query.categoryId;
            if (!empty(req.query?.subcategoryId)) query.subcategoryId = req.query.subcategoryId;
            if (!empty(req.query?.childCategoryId)) query.childCategoryId = req.query.childCategoryId;
            if (!empty(req.query?.productType)) query.productType = req.query.productType;
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.featured)) query.featured = req.query.featured === '1';
            if (!empty(req.query?.search)) {
                const regx = { $regex: new RegExp(req.query.search, 'i') };
                query.$or = [{ name: regx }, { productCode: regx }, { baseSku: regx }, { brand: regx }, { tags: regx }];
            }

            let sort: any = { createdAt: -1 };
            switch (req.query?.sort) {
                case 'OLDEST': sort = { createdAt: 1 }; break;
                case 'NAME_ASC': sort = { name: 1 }; break;
                case 'NAME_DESC': sort = { name: -1 }; break;
                case 'PRICE_ASC': sort = { 'pricing.price': 1 }; break;
                case 'PRICE_DESC': sort = { 'pricing.price': -1 }; break;
                case 'MANUAL': sort = { sortOrder: 1 }; break;
            }

            const result: any = await Product.paginate(query, {
                page, limit, sort,
                populate: [{ path: 'categoryId', model: 'categories' }, { path: 'subcategoryId', model: 'categories' }, { path: 'childCategoryId', model: 'categories' }],
                lean: true,
            });

            const categories = await Category.find({ level: 0, deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

            return res.render('panel/product/list', {
                title: 'Products',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                categories,
                filters: req.query || {},
                mediaUrl: (image: string | null) => MediaManager.Product.get(image),
                getEffectivePrice: Helper.getEffectivePrice,
            });
        } catch (e: any) {
            logError(e, '[PANEL-PRODUCT-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async createPage(req: any, res: any): Promise<void> {
        const resolutionData = await buildCategoryResolutionData([]);
        return res.render('panel/product/form', {
            title: 'Add Product',
            layout: 'panel/layout/main',
            record: null,
            mediaUrls: [],
            ...resolutionData,
        });
    }

    static async create(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const files: any = await MediaManager.Product.set({ images: 'max:10' }, req, res);
            if (files?.error) throw new Error(files.error);

            const sanitizeResult = await sanitize({ ...req?.body }, {
                name: `required | shorttext`,
                productCode: `shorttext`,
                baseSku: `shorttext`,
                brand: `shorttext`,
                shortDescription: `text`,
                description: `longtext`,
                productType: `required | in: SIMPLE,VARIABLE`,
                categoryId: `required | objectId | exist: Category._id (${PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND})`,
                subcategoryId: `objectId`,
                childCategoryId: `objectId`,
                status: `required | in: DRAFT,ACTIVE,INACTIVE,ARCHIVED`,
                visibility: `required | in: PUBLIC,PRIVATE,CATALOGUE_ONLY`,
                sortOrder: `number | normalize: number`,
                featured: `boolean | normalize: boolean`,
                isNewArrival: `boolean | normalize: boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            if (body.productType === 'SIMPLE' && empty(body.baseSku)) throw new Error('Base SKU is required for a simple product.');
            if (body.productType === 'SIMPLE' && empty(req.body?.price)) throw new Error('Price is required for a simple product.');

            await ProductController.validateSkuUniqueness(body, req.body?.variations, null);

            const newImageKeys = (files?.images || []).filter(Boolean);
            const images = Helper.mergeImages([], [], newImageKeys, req.body?.primaryImage || newImageKeys[0]);

            const attributes = Helper.parseAttributes(req.body?.attributes);
            const extraAttributes = Helper.parseAttributes(req.body?.extraAttributes).map((a: any) => ({ ...a, isProductLevelAddition: true }));
            const variationAttributes = body.productType === 'VARIABLE' ? Helper.parseVariationAttributes(req.body?.variationAttributes) : [];
            const variations = body.productType === 'VARIABLE' ? Helper.parseVariations(req.body?.variations) : [];

            const { simpleRawMaterial, simplePrice } = await applyDynamicPricing(body, req, variations);

            const record: any = await Product.create({
                name: body.name,
                productCode: body.productCode || null,
                baseSku: body.baseSku || null,
                brand: body.brand || null,
                shortDescription: body.shortDescription || null,
                description: body.description || null,
                productType: body.productType,

                categoryId: body.categoryId,
                subcategoryId: body.subcategoryId || null,
                childCategoryId: body.childCategoryId || null,

                images,
                attributes: [...attributes, ...extraAttributes],

                variationAttributes,
                variations,

                // salePrice / priceStartDate / priceEndDate / costPrice are no longer
                // collected via the form - omitted here so the schema's own defaults
                // (null) apply
                pricing: {
                    currency: req.body?.currency || 'INR',
                    price: simplePrice,
                },
                rawMaterial: simpleRawMaterial,

                // inventoryTracking / allowBackorders are no longer collected via the form -
                // omitted here so the schema's own defaults (true / false) apply
                inventory: {
                    globalStock: getNum(req.body?.globalStock, 0),
                    lowStockThreshold: getNum(req.body?.lowStockThreshold, 0),
                },

                // specifications / shipping / tax are no longer collected via the form -
                // omitted here so the schema's own defaults apply

                seo: {
                    title: req.body?.seoTitle || null,
                    description: req.body?.seoDescription || null,
                    keywords: getStr(req.body?.seoKeywords).split(',').map((t: string) => t.trim()).filter(Boolean),
                    slug: formatKey(req.body?.slug || body.name, '-', false),
                    canonicalUrl: req.body?.canonicalUrl || null,
                    searchable: getBool(req.body?.searchable),
                },

                status: body.status,
                visibility: body.visibility,
                featured: !!body.featured,
                isNewArrival: !!body.isNewArrival,
                isClearance: getBool(req.body?.isClearance),
                sortOrder: body.sortOrder || 0,

                createdBy: panelUser?._id,
                updatedBy: panelUser?._id,
            });
            Core.ProductWatch.dispatch(await Core.ProductWatch.capture([]), [record._id]);

            const createdSnapshot = { ...record, variationCount: (record.variations || []).length };
            await Core.ActivityLog.log({
                req, module: 'PRODUCT', entityId: record._id, entityLabel: record.name, action: 'CREATE',
                changes: Core.ActivityLog.diff({}, createdSnapshot, PRODUCT_TRACKED_FIELDS),
                summary: `Product "${record.name}" created`,
            });

            req.setFlash?.('success', PANEL_MSG.PRODUCT.CREATE.SUCCESS);
            return res.redirect(`/panel/products/${record._id}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PRODUCT.CREATE.FAIL);
            return res.redirect('/panel/products/create');
        }
    }

    static async viewPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Product.findOne({ _id: req.params.id, deletedAt: null }).populate([
                { path: 'categoryId', model: 'categories' },
                { path: 'subcategoryId', model: 'categories' },
                { path: 'childCategoryId', model: 'categories' },
            ]).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND);

            const auditLogs = await ActivityLog.find({ module: 'PRODUCT', entityId: req.params.id }).sort({ createdAt: -1 }).limit(30).lean();

            // resolve attribute/value names for display (attributes & variations only store ids) {
            const attributeIds = [
                ...(record.attributes || []).map((a: any) => a.attributeId),
                ...(record.variations || []).flatMap((v: any) => (v.attributeValues || []).map((av: any) => av.attributeId)),
            ];
            const valueIds = [
                ...(record.attributes || []).map((a: any) => a.attributeValueId).filter(Boolean),
                ...(record.variations || []).flatMap((v: any) => (v.attributeValues || []).map((av: any) => av.attributeValueId)),
            ];
            const attributesById: any = {};
            (await Attribute.find({ _id: { $in: attributeIds } }).lean()).forEach((a: any) => attributesById[getStr(a._id)] = a);
            const valuesById: any = {};
            (await AttributeValue.find({ _id: { $in: valueIds } }).lean()).forEach((v: any) => valuesById[getStr(v._id)] = v);

            const attributeRows = (record.attributes || []).map((a: any) => ({
                name: attributesById[getStr(a.attributeId)]?.name || 'Unknown',
                value: a.attributeValueId ? (valuesById[getStr(a.attributeValueId)]?.value || '-') : (a.textValue || a.numericValue || a.customValue || '-'),
                unit: a.unit || attributesById[getStr(a.attributeId)]?.unit || '',
                isProductLevelAddition: !!a.isProductLevelAddition,
            }));

            const variationRows = (record.variations || []).map((v: any) => ({
                ...v,
                combinationLabel: (v.attributeValues || []).map((av: any) => valuesById[getStr(av.attributeValueId)]?.value || '?').join(' / '),
            }));
            // } resolve attribute/value names for display

            return res.render('panel/product/view', {
                title: 'Product Details',
                layout: 'panel/layout/main',
                record,
                attributeRows,
                variationRows,
                auditLogs,
                mediaUrl: (image: string | null) => MediaManager.Product.get(image),
                getEffectivePrice: Helper.getEffectivePrice,
                getEffectiveSalePrice: Helper.getEffectiveSalePrice,
                getStockStatus: Helper.getStockStatus,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/products');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Product.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND);

            const resolutionData = await buildCategoryResolutionData([record.categoryId, record.subcategoryId, record.childCategoryId]);

            return res.render('panel/product/form', {
                title: 'Edit Product',
                layout: 'panel/layout/main',
                record,
                mediaUrls: (record.images || []).map((img: any) => ({ ...img, url: MediaManager.Product.get(img.image) })),
                ...resolutionData,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/products');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await Product.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND);

            const files: any = await MediaManager.Product.set({ images: 'max:10' }, req, res);
            if (files?.error) throw new Error(files.error);

            const sanitizeResult = await sanitize({ ...req?.body }, {
                name: `required | shorttext`,
                productCode: `shorttext`,
                baseSku: `shorttext`,
                brand: `shorttext`,
                shortDescription: `text`,
                description: `longtext`,
                productType: `required | in: SIMPLE,VARIABLE`,
                categoryId: `required | objectId | exist: Category._id (${PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND})`,
                subcategoryId: `objectId`,
                childCategoryId: `objectId`,
                status: `required | in: DRAFT,ACTIVE,INACTIVE,ARCHIVED`,
                visibility: `required | in: PUBLIC,PRIVATE,CATALOGUE_ONLY`,
                sortOrder: `number | normalize: number`,
                featured: `boolean | normalize: boolean`,
                isNewArrival: `boolean | normalize: boolean`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            if (body.productType === 'SIMPLE' && empty(body.baseSku)) throw new Error('Base SKU is required for a simple product.');
            if (body.productType === 'SIMPLE' && empty(req.body?.price)) throw new Error('Price is required for a simple product.');

            await ProductController.validateSkuUniqueness(body, req.body?.variations, req.params.id);

            const removeImageKeys = [].concat(req.body?.removeImages || []).filter(Boolean);
            const newImageKeys = (files?.images || []).filter(Boolean);
            if (removeImageKeys.length) MediaManager.Product.remove(removeImageKeys);
            const images = Helper.mergeImages(record.images, removeImageKeys, newImageKeys, req.body?.primaryImage);

            const attributes = Helper.parseAttributes(req.body?.attributes);
            const extraAttributes = Helper.parseAttributes(req.body?.extraAttributes).map((a: any) => ({ ...a, isProductLevelAddition: true }));
            const variationAttributes = body.productType === 'VARIABLE' ? Helper.parseVariationAttributes(req.body?.variationAttributes) : [];
            const variations = body.productType === 'VARIABLE'
                ? Helper.mergeExistingVariationState(record.variations, Helper.parseVariations(req.body?.variations))
                : [];

            const { simpleRawMaterial, simplePrice: newPrice } = await applyDynamicPricing(body, req, variations, record.rawMaterial);

            // additionalCategoryIds / tags / specifications / shipping / tax, and the
            // salePrice/priceStartDate/priceEndDate/inventoryTracking/allowBackorders
            // sub-fields, are no longer collected via the form. Using dot-notation (and
            // simply omitting the top-level keys the form doesn't touch at all) means
            // this $set leaves that existing data untouched rather than wiping it.
            const payload: any = {
                name: body.name,
                productCode: body.productCode || null,
                baseSku: body.baseSku || null,
                brand: body.brand || null,
                shortDescription: body.shortDescription || null,
                description: body.description || null,
                productType: body.productType,

                categoryId: body.categoryId,
                subcategoryId: body.subcategoryId || null,
                childCategoryId: body.childCategoryId || null,

                images,
                attributes: [...attributes, ...extraAttributes],

                variationAttributes,
                variations,

                'pricing.currency': req.body?.currency || 'INR',
                'pricing.costPrice': record.pricing?.costPrice ?? null,
                'pricing.price': newPrice,
                rawMaterial: simpleRawMaterial,

                'inventory.globalStock': getNum(req.body?.globalStock, 0),
                'inventory.lowStockThreshold': getNum(req.body?.lowStockThreshold, 0),

                seo: {
                    title: req.body?.seoTitle || null,
                    description: req.body?.seoDescription || null,
                    keywords: getStr(req.body?.seoKeywords).split(',').map((t: string) => t.trim()).filter(Boolean),
                    slug: formatKey(req.body?.slug || body.name, '-', false),
                    canonicalUrl: req.body?.canonicalUrl || null,
                    searchable: getBool(req.body?.searchable),
                },

                status: body.status,
                visibility: body.visibility,
                featured: !!body.featured,
                isNewArrival: !!body.isNewArrival,
                isClearance: getBool(req.body?.isClearance),
                sortOrder: body.sortOrder || 0,

                updatedBy: panelUser?._id,
            };

            await Core.ProductWatch.track([req.params.id], () => Product.findByIdAndUpdate(req.params.id, { $set: payload }));

            // activity log - diff the pre-update record against the values just
            // written, so the log shows exactly which curated fields changed {
            const oldSnapshot = { ...record, variationCount: (record.variations || []).length };
            const newSnapshot = {
                name: payload.name, status: payload.status, visibility: payload.visibility, featured: payload.featured,
                pricing: { price: payload['pricing.price'] },
                inventory: { globalStock: payload['inventory.globalStock'], lowStockThreshold: payload['inventory.lowStockThreshold'] },
                categoryId: payload.categoryId, subcategoryId: payload.subcategoryId, childCategoryId: payload.childCategoryId,
                variationCount: variations.length,
            };
            const changes = [
                ...Core.ActivityLog.diff(oldSnapshot, newSnapshot, PRODUCT_TRACKED_FIELDS),
                ...Core.ActivityLog.diffVariations(record.variations || [], variations),
            ];
            await Core.ActivityLog.log({
                req, module: 'PRODUCT', entityId: req.params.id, entityLabel: payload.name, action: 'UPDATE',
                changes, summary: changes.length ? undefined : `Product "${payload.name}" updated (no tracked fields changed)`,
            });
            // }

            req.setFlash?.('success', PANEL_MSG.PRODUCT.UPDATE.SUCCESS);
            return res.redirect(`/panel/products/${req.params.id}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PRODUCT.UPDATE.FAIL);
            return res.redirect(`/panel/products/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await Product.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND);

            await Product.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

            await Core.ActivityLog.log({
                req, module: 'PRODUCT', entityId: record._id, entityLabel: record.name, action: 'DELETE',
                summary: `Product "${record.name}" deleted`,
            });

            req.setFlash?.('success', PANEL_MSG.PRODUCT.DELETE.SUCCESS);
            return res.redirect('/panel/products');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.PRODUCT.DELETE.FAIL);
            return res.redirect('/panel/products');
        }
    }

    static async duplicate(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await Product.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND);

            delete record._id;
            record.name = `${record.name} (Copy)`;
            record.productCode = null;
            record.baseSku = record.productType === 'SIMPLE' ? null : record.baseSku;
            record.seo.slug = formatKey(`${record.name}-${Date.now()}`, '-', false);
            record.status = 'DRAFT';
            record.variations = (record.variations || []).map((v: any) => ({ ...v, sku: null, _id: undefined }));
            record.createdBy = panelUser?._id;
            record.updatedBy = panelUser?._id;
            delete record.createdAt;
            delete record.updatedAt;

            const duplicated: any = await Product.create(record);
            await Core.ActivityLog.log({
                req, module: 'PRODUCT', entityId: duplicated._id, entityLabel: duplicated.name, action: 'CREATE',
                summary: `Duplicated from product "${req.params.id}"`,
            });

            req.setFlash?.('success', 'Product duplicated successfully. Variation SKUs were cleared - please set new ones before publishing.');
            return res.redirect(`/panel/products/${duplicated._id}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products');
        }
    }

    static async setStatus(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const status = req.body?.status;
            if (!['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) throw new Error(PANEL_MSG.COMMON.DATA.INVALID);

            const record: any = await Product.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.PRODUCT.DETAILS.NOT_FOUND);

            await Core.ProductWatch.track([req.params.id], () => Product.findByIdAndUpdate(req.params.id, { status }));
            await Core.ActivityLog.log({
                req, module: 'PRODUCT', entityId: req.params.id, entityLabel: record.name, action: 'STATUS_CHANGE',
                changes: [{ field: 'status', label: 'Status', oldValue: record.status, newValue: status }],
            });

            req.setFlash?.('success', `Product marked as ${status.toLowerCase()}.`);
            return res.redirect(`/panel/products/${req.params.id}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/products');
        }
    }

    // shared SKU uniqueness guard - a SKU (base or variation) must be unique across every other
    // product's base SKU AND every other product's variation SKUs (they share one namespace) {
    static async validateSkuUniqueness(body: any, rawVariations: any, excludeId: string | null): Promise<void> {
        const skusToCheck: string[] = [];
        if (!empty(body.baseSku)) skusToCheck.push(body.baseSku);

        const variations = Helper.parseVariations(rawVariations);

        // a variation with no SKU can't be tracked in the Stock Update export/import
        // sheet (its SKU column comes back blank, and re-uploading it then fails
        // with "SKU missing") - reject it here rather than letting it save silently.
        if (body.productType === 'VARIABLE' && variations.some((v: any) => empty(v.sku))) {
            throw new Error('Every variation needs a SKU.');
        }

        for (const v of variations) if (!empty(v.sku)) skusToCheck.push(v.sku);

        const duplicateWithinRequest = skusToCheck.find((sku, i) => skusToCheck.indexOf(sku) !== i);
        if (duplicateWithinRequest) throw new Error(`${PANEL_MSG.PRODUCT.DETAILS.SKU_EXIST}: ${duplicateWithinRequest}`);

        for (const sku of skusToCheck) {
            const query: any = { $or: [{ baseSku: sku }, { 'variations.sku': sku }], deletedAt: null };
            if (excludeId) query._id = { $ne: excludeId };
            const exist: any = await Product.findOne(query).lean();
            if (!empty(exist)) throw new Error(`${PANEL_MSG.PRODUCT.DETAILS.SKU_EXIST}: ${sku}`);
        }
    }
    // } shared SKU uniqueness guard

}
