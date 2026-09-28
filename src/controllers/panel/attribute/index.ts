// Models
import { Attribute } from '../../../models/attribute';
import { AttributeValue } from '../../../models/attribute-value';
import { AttributeSet } from '../../../models/attribute-set';
import { Product } from '../../../models/product';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, getBool, formatKey } from '../../../utils';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export const INPUT_TYPES = ['SELECT', 'MULTI_SELECT', 'TEXT', 'COLOR', 'MEASUREMENT', 'BOOLEAN'];

// Only attributes with one of these input types have a fixed list of allowed
// values, so only these can have Values added or be used as a variation attribute.
export const VALUE_BASED_INPUT_TYPES = ['SELECT', 'MULTI_SELECT', 'COLOR'];

export default class AttributeController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { deletedAt: null };
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.search)) query.name = { $regex: new RegExp(req.query.search, 'i') };

            const result: any = await Attribute.paginate(query, { page, limit, sort: { sortOrder: 1, name: 1 }, lean: true });

            const valueCounts = await AttributeValue.aggregate([
                { $match: { attributeId: { $in: result.docs.map((d: any) => d._id) }, deletedAt: null } },
                { $group: { _id: '$attributeId', count: { $sum: 1 } } },
            ]);
            const countMap: any = {};
            valueCounts.forEach((v: any) => countMap[v._id.toString()] = v.count);

            return res.render('panel/attribute/list', {
                title: 'Attributes',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
                countMap,
            });
        } catch (e: any) {
            logError(e, '[PANEL-ATTRIBUTE-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static createPage(req: any, res: any): void {
        return res.render('panel/attribute/form', { title: 'Add Attribute', layout: 'panel/layout/main', record: null, values: [], inputTypes: INPUT_TYPES });
    }

    static async create(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                name: `required | shorttext`,
                code: `required | shorttext`,
                inputType: `required | in: ${INPUT_TYPES.join(',')}`,
                unit: `shorttext`,
                isVariationAttribute: `boolean | normalize: boolean`,
                isRequired: `boolean | normalize: boolean`,
                allowCustomValue: `boolean | normalize: boolean`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const code = formatKey(body.code, '-', false);
            const existCode: any = await Attribute.findOne({ code, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.CODE_EXIST);

            const record: any = await Attribute.create({
                name: body.name,
                code,
                inputType: body.inputType,
                unit: body.unit || null,
                isVariationAttribute: !!body.isVariationAttribute,
                isRequired: !!body.isRequired,
                allowCustomValue: !!body.allowCustomValue,
                sortOrder: body.sortOrder || 0,
                status: body.status,
            });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE.CREATE.SUCCESS);
            return res.redirect(`/panel/attributes/${record._id}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE.CREATE.FAIL);
            return res.redirect('/panel/attributes/create');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Attribute.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.NOT_FOUND);

            const values = await AttributeValue.find({ attributeId: req.params.id, deletedAt: null }).sort({ sortOrder: 1, value: 1 }).lean();

            return res.render('panel/attribute/form', {
                title: 'Edit Attribute',
                layout: 'panel/layout/main',
                record,
                values,
                inputTypes: INPUT_TYPES,
                valueBasedInputTypes: VALUE_BASED_INPUT_TYPES,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/attributes');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                name: `required | shorttext`,
                code: `required | shorttext`,
                inputType: `required | in: ${INPUT_TYPES.join(',')}`,
                unit: `shorttext`,
                isVariationAttribute: `boolean | normalize: boolean`,
                isRequired: `boolean | normalize: boolean`,
                allowCustomValue: `boolean | normalize: boolean`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const record: any = await Attribute.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.NOT_FOUND);

            const code = formatKey(body.code, '-', false);
            const existCode: any = await Attribute.findOne({ _id: { $ne: req.params.id }, code, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.CODE_EXIST);

            await Attribute.findByIdAndUpdate(req.params.id, {
                name: body.name,
                code,
                inputType: body.inputType,
                unit: body.unit || null,
                isVariationAttribute: !!body.isVariationAttribute,
                isRequired: !!body.isRequired,
                allowCustomValue: !!body.allowCustomValue,
                sortOrder: body.sortOrder || 0,
                status: body.status,
            });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE.UPDATE.SUCCESS);
            return res.redirect(`/panel/attributes/${req.params.id}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE.UPDATE.FAIL);
            return res.redirect(`/panel/attributes/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await Attribute.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.NOT_FOUND);

            const usedInSet: any = await AttributeSet.findOne({ 'items.attributeId': req.params.id, deletedAt: null }).lean();
            if (!empty(usedInSet)) throw new Error(PANEL_MSG.ATTRIBUTE.DELETE.IN_USE);

            const usedInProduct: any = await Product.findOne({ 'attributes.attributeId': req.params.id, deletedAt: null }).lean();
            if (!empty(usedInProduct)) throw new Error(PANEL_MSG.ATTRIBUTE.DELETE.IN_USE);

            await Attribute.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
            await AttributeValue.updateMany({ attributeId: req.params.id }, { deletedAt: new Date() });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE.DELETE.SUCCESS);
            return res.redirect('/panel/attributes');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE.DELETE.FAIL);
            return res.redirect('/panel/attributes');
        }
    }

}
