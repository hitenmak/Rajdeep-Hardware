// Models
import { Attribute } from '../../../models/attribute';
import { AttributeValue } from '../../../models/attribute-value';
import { AttributeSet } from '../../../models/attribute-set';
import { Category } from '../../../models/category';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, getBool, formatKey, getStr } from '../../../utils';

// Others
import { PANEL_MSG } from '../../../common/messages';
import { VALUE_BASED_INPUT_TYPES } from '../attribute';

//--------------------------------------------------------------

// build { attribute list, valuesByAttributeId, inputTypeByAttributeId } used by both create/edit forms {
const getFormOptions = async (): Promise<any> => {
    const attributes = await Attribute.find({ status: 'ACTIVE', deletedAt: null }).sort({ sortOrder: 1, name: 1 }).lean();
    const values = await AttributeValue.find({ status: 'ACTIVE', deletedAt: null }).sort({ sortOrder: 1, value: 1 }).lean();

    const valuesByAttributeId: any = {};
    values.forEach((v: any) => {
        const key = getStr(v.attributeId);
        valuesByAttributeId[key] = valuesByAttributeId[key] || [];
        valuesByAttributeId[key].push({ id: getStr(v._id), value: v.value });
    });

    const inputTypeByAttributeId: any = {};
    attributes.forEach((a: any) => inputTypeByAttributeId[getStr(a._id)] = a.inputType);

    return { attributes, valuesByAttributeId, inputTypeByAttributeId, valueBasedInputTypes: VALUE_BASED_INPUT_TYPES };
}
// } build form options

const parseItems = (rawItems: any, inputTypeByAttributeId: any = {}): any[] => {
    const items: any[] = [];
    for (const attributeId in rawItems || {}) {
        const item = rawItems[attributeId] || {};
        if (!getBool(item.included)) continue;

        let allowedValueIds = item.allowedValueIds || [];
        if (!Array.isArray(allowedValueIds)) allowedValueIds = [allowedValueIds];

        // only SELECT / MULTI_SELECT / COLOR attributes have a fixed value list, so only
        // those can be used as a variation attribute - enforced here too, not just in the form
        const canBeVariationAttribute = VALUE_BASED_INPUT_TYPES.includes(inputTypeByAttributeId[attributeId]);

        items.push({
            attributeId,
            isRequired: getBool(item.isRequired),
            isVariationAttribute: canBeVariationAttribute && getBool(item.isVariationAttribute),
            allowedValueIds: allowedValueIds.filter(Boolean),
        });
    }
    return items;
}

// input types for just the attributes referenced in a submitted `items` object -
// used to enforce the variation-attribute eligibility rule server-side too {
const getInputTypeMap = async (rawItems: any): Promise<any> => {
    const attributeIds = Object.keys(rawItems || {});
    if (!attributeIds.length) return {};

    const attributes = await Attribute.find({ _id: { $in: attributeIds } }).select('inputType').lean();
    const inputTypeByAttributeId: any = {};
    attributes.forEach((a: any) => inputTypeByAttributeId[getStr(a._id)] = a.inputType);
    return inputTypeByAttributeId;
}
// } input types for just the attributes referenced in a submitted `items` object

export default class AttributeSetController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { deletedAt: null };
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.search)) query.name = { $regex: new RegExp(req.query.search, 'i') };

            const result: any = await AttributeSet.paginate(query, { page, limit, sort: { sortOrder: 1, name: 1 }, lean: true });

            const categoryCounts = await Category.aggregate([
                { $match: { attributeSetId: { $in: result.docs.map((d: any) => d._id) }, deletedAt: null } },
                { $group: { _id: '$attributeSetId', count: { $sum: 1 } } },
            ]);
            const countMap: any = {};
            categoryCounts.forEach((c: any) => countMap[c._id.toString()] = c.count);

            return res.render('panel/attribute-set/list', {
                title: 'Attribute Sets',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
                countMap,
            });
        } catch (e: any) {
            logError(e, '[PANEL-ATTRIBUTE-SET-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static async createPage(req: any, res: any): Promise<void> {
        const options = await getFormOptions();
        return res.render('panel/attribute-set/form', { title: 'Add Attribute Set', layout: 'panel/layout/main', record: null, itemsByAttributeId: {}, ...options });
    }

    static async create(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                name: `required | shorttext`,
                code: `required | shorttext`,
                description: `longtext`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const code = formatKey(body.code, '-', false);
            const existCode: any = await AttributeSet.findOne({ code, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.ATTRIBUTE_SET.DETAILS.CODE_EXIST);

            const items = parseItems(req.body?.items, await getInputTypeMap(req.body?.items));

            await AttributeSet.create({
                name: body.name,
                code,
                description: body.description || null,
                sortOrder: body.sortOrder || 0,
                status: body.status,
                items,
            });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE_SET.CREATE.SUCCESS);
            return res.redirect('/panel/attribute-sets');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE_SET.CREATE.FAIL);
            return res.redirect('/panel/attribute-sets/create');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await AttributeSet.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE_SET.DETAILS.NOT_FOUND);

            const options = await getFormOptions();

            const itemsByAttributeId: any = {};
            (record.items || []).forEach((item: any) => itemsByAttributeId[getStr(item.attributeId)] = item);

            return res.render('panel/attribute-set/form', {
                title: 'Edit Attribute Set',
                layout: 'panel/layout/main',
                record,
                itemsByAttributeId,
                ...options,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/attribute-sets');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                name: `required | shorttext`,
                code: `required | shorttext`,
                description: `longtext`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const record: any = await AttributeSet.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE_SET.DETAILS.NOT_FOUND);

            const code = formatKey(body.code, '-', false);
            const existCode: any = await AttributeSet.findOne({ _id: { $ne: req.params.id }, code, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.ATTRIBUTE_SET.DETAILS.CODE_EXIST);

            const items = parseItems(req.body?.items, await getInputTypeMap(req.body?.items));

            // 6.11/6.12: changing the set must never delete existing product attribute VALUES;
            // this is enforced by only ever adding new resolvable attributes at read-time
            // (Core.Attribute.resolve) and never stripping a product's stored `attributes` array here.
            await AttributeSet.findByIdAndUpdate(req.params.id, {
                name: body.name,
                code,
                description: body.description || null,
                sortOrder: body.sortOrder || 0,
                status: body.status,
                items,
            });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE_SET.UPDATE.SUCCESS);
            return res.redirect('/panel/attribute-sets');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE_SET.UPDATE.FAIL);
            return res.redirect(`/panel/attribute-sets/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await AttributeSet.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE_SET.DETAILS.NOT_FOUND);

            const usedInCategory: any = await Category.findOne({
                $or: [{ attributeSetId: req.params.id }, { overrideAttributeSetId: req.params.id }],
                deletedAt: null,
            }).lean();
            if (!empty(usedInCategory)) throw new Error(PANEL_MSG.ATTRIBUTE_SET.DELETE.IN_USE);

            await AttributeSet.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE_SET.DELETE.SUCCESS);
            return res.redirect('/panel/attribute-sets');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE_SET.DELETE.FAIL);
            return res.redirect('/panel/attribute-sets');
        }
    }

}
