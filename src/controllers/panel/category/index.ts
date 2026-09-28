// Models
import { Category } from '../../../models/category';
import { AttributeSet } from '../../../models/attribute-set';
import { Attribute } from '../../../models/attribute';
import { Product } from '../../../models/product';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, getBool, formatKey, getStr } from '../../../utils';
import MediaManager from '../../../services/media';
import Core from '../../../core';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export const LEVEL_LABELS = ['Category', 'Subcategory', 'Sub-subcategory'];
const MAX_LEVEL = LEVEL_LABELS.length - 1; // 2 - three levels total (0, 1, 2)

const CATEGORY_TRACKED_FIELDS = [
    { key: 'name', label: 'Name' },
    { key: 'parentId', label: 'Parent' },
    { key: 'status', label: 'Status' },
    { key: 'attributeSetId', label: 'Attribute Set' },
    { key: 'sortOrder', label: 'Sort Order' },
];

// every category that could legally be a parent - a level-2 node can't have
// children since 3 levels is the cap, so only level 0/1 nodes qualify. Each is
// labeled with its own ancestry so the admin can tell branches apart in a flat
// <select> (this app has no tree/nested UI anywhere, hierarchy is communicated
// through labels/columns, same as the old Subcategory list's category filter) {
const getParentOptions = async (): Promise<any[]> => {
    const nodes = await Category.find({ level: { $lt: MAX_LEVEL }, deletedAt: null }).select('_id name level parentId').sort({ name: 1 }).lean();
    const byId: any = {};
    nodes.forEach((n: any) => byId[getStr(n._id)] = n);

    return nodes.map((n: any) => {
        const path = [n.name];
        let cursor: any = n.parentId ? byId[getStr(n.parentId)] : null;
        while (cursor) { path.unshift(cursor.name); cursor = cursor.parentId ? byId[getStr(cursor.parentId)] : null; }
        return { id: getStr(n._id), name: n.name, level: n.level, label: path.join(' > ') };
    }).sort((a: any, b: any) => a.label.localeCompare(b.label));
}
// } parent options

// build a light-weight preview list (attribute set id -> attribute names) for embedding in the form {
const getAttributeSetOptions = async (): Promise<any[]> => {
    const sets = await AttributeSet.find({ status: 'ACTIVE', deletedAt: null }).sort({ name: 1 }).lean();

    const allAttributeIds = sets.flatMap((s: any) => (s.items || []).map((i: any) => getStr(i.attributeId)));
    const attributes = await Attribute.find({ _id: { $in: allAttributeIds } }).lean();
    const attributeNameById: any = {};
    attributes.forEach((a: any) => attributeNameById[getStr(a._id)] = a.name);

    return sets.map((s: any) => ({
        id: getStr(s._id),
        name: s.name,
        attributeNames: (s.items || []).map((i: any) => attributeNameById[getStr(i.attributeId)]).filter(Boolean),
    }));
}
// } build a light-weight preview list

// attributes + attribute sets for the child-level ADD/OVERRIDE sections {
const getAttributeRuleOptions = async (): Promise<any> => {
    const attributes = await Attribute.find({ status: 'ACTIVE', deletedAt: null }).select('_id name code').sort({ name: 1 }).lean();
    const attributeSets = await AttributeSet.find({ status: 'ACTIVE', deletedAt: null }).select('_id name').sort({ name: 1 }).lean();

    return {
        attributes: attributes.map((a: any) => ({ id: getStr(a._id), name: a.name, code: a.code })),
        attributeSets: attributeSets.map((s: any) => ({ id: getStr(s._id), name: s.name })),
    };
}
// } attribute rule options

export default class CategoryController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { deletedAt: null };
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.search)) query.name = { $regex: new RegExp(req.query.search, 'i') };
            if (!empty(req.query?.parentId)) query.parentId = req.query.parentId;
            if (req.query?.level !== undefined && req.query?.level !== '') query.level = getNum(req.query.level, 0);

            const sort: any = {};
            sort[req.query?.sortBy || 'sortOrder'] = req.query?.sortDir === 'desc' ? -1 : 1;

            const result: any = await Category.paginate(query, {
                page, limit, sort,
                populate: [{ path: 'parentId', model: 'categories' }, { path: 'attributeSetId', model: 'attributeSets' }],
                lean: true,
            });

            const parentOptions = await getParentOptions();

            return res.render('panel/category/list', {
                title: 'Categories',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
                parentOptions,
                levelLabels: LEVEL_LABELS,
                mediaUrl: (image: string | null) => MediaManager.Category.get(image),
            });
        } catch (e: any) {
            logError(e, '[PANEL-CATEGORY-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async createPage(req: any, res: any): Promise<void> {
        const attributeSets = await getAttributeSetOptions();
        const ruleOptions = await getAttributeRuleOptions();
        const parentOptions = await getParentOptions();
        return res.render('panel/category/form', {
            title: 'Add Category', layout: 'panel/layout/main', record: null, mediaUrl: null,
            attributeSets, parentOptions, levelLabels: LEVEL_LABELS, ...ruleOptions,
        });
    }

    static async create(req: any, res: any): Promise<void> {
        try {
            const file: any = await MediaManager.Category.set({ image: '' }, req, res);
            if (file?.error) throw new Error(file.error);

            const sanitizeResult = await sanitize({ ...req?.body, ...file }, {
                parentId: `objectId | exist: Category._id (${PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND})`,
                name: `required | shorttext`,
                code: `shorttext`,
                description: `longtext`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
                image: `string`,
                attributeSetId: `objectId`,
                seoTitle: `shorttext`,
                seoDescription: `longtext`,
                allowSubcategoryAttributeAdditions: `boolean | normalize: boolean`,
                allowProductLevelAttributeAdditions: `boolean | normalize: boolean`,
                attributeMode: `in: INHERIT,ADD,OVERRIDE`,
                overrideAttributeSetId: `objectId`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            let parent: any = null;
            let level = 0;
            if (!empty(body.parentId)) {
                parent = await Category.findOne({ _id: body.parentId, deletedAt: null }).lean();
                if (empty(parent)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND);
                if (parent.level >= MAX_LEVEL) throw new Error(PANEL_MSG.CATEGORY.DETAILS.MAX_DEPTH);
                level = parent.level + 1;
            }

            const existName: any = await Category.findOne({ parentId: parent ? parent._id : null, name: body.name, deletedAt: null }).lean();
            if (!empty(existName)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NAME_EXIST);

            let additionalAttributeIds: string[] = [];
            if (level > 0 && body.attributeMode === 'ADD') additionalAttributeIds = [].concat(req.body?.additionalAttributeIds || []).filter(Boolean);

            const record: any = await Category.create({
                parentId: parent ? parent._id : null,
                level,
                name: body.name,
                code: body.code || null,
                slug: formatKey(body.name, '-', false),
                description: body.description || null,
                image: body.image || null,
                sortOrder: body.sortOrder || 0,
                status: body.status,
                seoTitle: body.seoTitle || null,
                seoDescription: body.seoDescription || null,
                attributeSetId: body.attributeSetId || null,
                allowSubcategoryAttributeAdditions: body.allowSubcategoryAttributeAdditions !== false,
                allowProductLevelAttributeAdditions: body.allowProductLevelAttributeAdditions !== false,
                attributeMode: level > 0 ? (body.attributeMode || 'INHERIT') : 'INHERIT',
                additionalAttributeIds,
                overrideAttributeSetId: level > 0 && body.attributeMode === 'OVERRIDE' ? (body.overrideAttributeSetId || null) : null,
            });

            await Core.ActivityLog.log({
                req, module: 'CATEGORY', entityId: record._id, entityLabel: record.name, action: 'CREATE',
                changes: Core.ActivityLog.diff({}, record, CATEGORY_TRACKED_FIELDS),
                summary: `${LEVEL_LABELS[level]} "${record.name}" created`,
            });

            req.setFlash?.('success', PANEL_MSG.CATEGORY.CREATE.SUCCESS);
            return res.redirect('/panel/categories');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.CATEGORY.CREATE.FAIL);
            return res.redirect('/panel/categories/create');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Category.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND);

            const attributeSets = await getAttributeSetOptions();
            const ruleOptions = await getAttributeRuleOptions();
            const parentOptions = (await getParentOptions()).filter((o: any) => o.id !== getStr(record._id));

            return res.render('panel/category/form', {
                title: 'Edit Category',
                layout: 'panel/layout/main',
                record,
                attributeSets,
                parentOptions,
                levelLabels: LEVEL_LABELS,
                ...ruleOptions,
                mediaUrl: !empty(record?.image) ? MediaManager.Category.get(record.image) : null,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/categories');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        try {
            const record: any = await Category.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND);

            const file: any = await MediaManager.Category.set({ image: '' }, req, res);
            if (file?.error) throw new Error(file.error);

            const sanitizeResult = await sanitize({ ...req?.body, ...file }, {
                parentId: `objectId | exist: Category._id (${PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND})`,
                name: `required | shorttext`,
                code: `shorttext`,
                description: `longtext`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
                image: `string`,
                attributeSetId: `objectId`,
                seoTitle: `shorttext`,
                seoDescription: `longtext`,
                allowSubcategoryAttributeAdditions: `boolean | normalize: boolean`,
                allowProductLevelAttributeAdditions: `boolean | normalize: boolean`,
                attributeMode: `in: INHERIT,ADD,OVERRIDE`,
                overrideAttributeSetId: `objectId`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            let parent: any = null;
            let level = 0;
            if (!empty(body.parentId)) {
                if (body.parentId === getStr(record._id)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.MAX_DEPTH);
                parent = await Category.findOne({ _id: body.parentId, deletedAt: null }).lean();
                if (empty(parent)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND);
                if (parent.level >= MAX_LEVEL) throw new Error(PANEL_MSG.CATEGORY.DETAILS.MAX_DEPTH);
                level = parent.level + 1;
            }

            // a node with its own children can't be re-parented under something
            // that would push it (or its children) past the 3-level cap {
            if (level > 0) {
                const hasChild: any = await Category.findOne({ parentId: record._id, deletedAt: null }).lean();
                if (hasChild && level + 1 > MAX_LEVEL) throw new Error(PANEL_MSG.CATEGORY.DETAILS.MAX_DEPTH);
            }
            // }

            const existName: any = await Category.findOne({ _id: { $ne: req.params.id }, parentId: parent ? parent._id : null, name: body.name, deletedAt: null }).lean();
            if (!empty(existName)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NAME_EXIST);

            // remove old image if a new one uploaded {
            if (!empty(body.image) && !empty(record.image)) MediaManager.Category.remove(record.image);
            // } remove old image if a new one uploaded

            let additionalAttributeIds: string[] = [];
            if (level > 0 && body.attributeMode === 'ADD') additionalAttributeIds = [].concat(req.body?.additionalAttributeIds || []).filter(Boolean);

            const newValues = {
                parentId: parent ? parent._id : null,
                level,
                name: body.name,
                status: body.status,
                attributeSetId: body.attributeSetId || null,
                sortOrder: body.sortOrder || 0,
            };

            await Category.findByIdAndUpdate(req.params.id, {
                ...newValues,
                code: body.code || null,
                slug: formatKey(body.name, '-', false),
                description: body.description || null,
                image: body.image || record.image || null,
                seoTitle: body.seoTitle || null,
                seoDescription: body.seoDescription || null,
                allowSubcategoryAttributeAdditions: body.allowSubcategoryAttributeAdditions !== false,
                allowProductLevelAttributeAdditions: body.allowProductLevelAttributeAdditions !== false,
                attributeMode: level > 0 ? (body.attributeMode || 'INHERIT') : 'INHERIT',
                additionalAttributeIds,
                overrideAttributeSetId: level > 0 && body.attributeMode === 'OVERRIDE' ? (body.overrideAttributeSetId || null) : null,
            });

            const changes = Core.ActivityLog.diff(record, newValues, CATEGORY_TRACKED_FIELDS);
            await Core.ActivityLog.log({
                req, module: 'CATEGORY', entityId: req.params.id, entityLabel: body.name, action: 'UPDATE',
                changes, summary: changes.length ? undefined : `${LEVEL_LABELS[level]} "${body.name}" updated (no tracked fields changed)`,
            });

            req.setFlash?.('success', PANEL_MSG.CATEGORY.UPDATE.SUCCESS);
            return res.redirect('/panel/categories');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.CATEGORY.UPDATE.FAIL);
            return res.redirect(`/panel/categories/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await Category.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.CATEGORY.DETAILS.NOT_FOUND);

            const hasChild: any = await Category.findOne({ parentId: req.params.id, deletedAt: null }).lean();
            if (!empty(hasChild)) throw new Error(PANEL_MSG.CATEGORY.DELETE.HAS_SUBCATEGORY);

            const hasProduct: any = await Product.findOne({
                $or: [{ categoryId: req.params.id }, { subcategoryId: req.params.id }, { childCategoryId: req.params.id }],
                deletedAt: null,
            }).lean();
            if (!empty(hasProduct)) throw new Error(PANEL_MSG.CATEGORY.DELETE.HAS_PRODUCT);

            await Category.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

            await Core.ActivityLog.log({
                req, module: 'CATEGORY', entityId: record._id, entityLabel: record.name, action: 'DELETE',
                summary: `${LEVEL_LABELS[record.level] || 'Category'} "${record.name}" deleted`,
            });

            req.setFlash?.('success', PANEL_MSG.CATEGORY.DELETE.SUCCESS);
            return res.redirect('/panel/categories');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.CATEGORY.DELETE.FAIL);
            return res.redirect('/panel/categories');
        }
    }

}
