// Models
import { Attribute } from '../../../models/attribute';
import { AttributeValue } from '../../../models/attribute-value';
import { Product } from '../../../models/product';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum, formatKey } from '../../../utils';
import MediaManager from '../../../services/media';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------

export default class AttributeValueController {

    static async create(req: any, res: any): Promise<void> {
        const attributeId = req.params.attributeId;

        try {
            const attribute: any = await Attribute.findOne({ _id: attributeId, deletedAt: null }).lean();
            if (empty(attribute)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.NOT_FOUND);

            const file: any = await MediaManager.AttributeValue.set({ image: '' }, req, res);
            if (file?.error) throw new Error(file.error);

            const sanitizeResult = await sanitize({ ...req?.body, ...file }, {
                value: `required | shorttext`,
                code: `required | shorttext`,
                displayValue: `shorttext`,
                hexCode: `shorttext`,
                description: `longtext`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
                image: `string`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const code = formatKey(body.code, '-', false);
            const existCode: any = await AttributeValue.findOne({ attributeId, code, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.ATTRIBUTE.VALUE.CODE_EXIST);

            await AttributeValue.create({
                attributeId,
                value: body.value,
                code,
                displayValue: body.displayValue || null,
                hexCode: body.hexCode || null,
                image: body.image || null,
                description: body.description || null,
                sortOrder: body.sortOrder || 0,
                status: body.status,
            });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE.VALUE.CREATE_SUCCESS);
            return res.redirect(`/panel/attributes/${attributeId}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE.VALUE.FAIL);
            return res.redirect(`/panel/attributes/${attributeId}/edit`);
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        const { attributeId, valueId } = req.params;

        try {
            const attribute: any = await Attribute.findOne({ _id: attributeId, deletedAt: null }).lean();
            if (empty(attribute)) throw new Error(PANEL_MSG.ATTRIBUTE.DETAILS.NOT_FOUND);

            const record: any = await AttributeValue.findOne({ _id: valueId, attributeId, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE.VALUE.NOT_FOUND);

            return res.render('panel/attribute-value/form', {
                title: 'Edit Attribute Value',
                layout: 'panel/layout/main',
                attribute,
                record,
                mediaUrl: !empty(record.image) ? MediaManager.AttributeValue.get(record.image) : null,
            });
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect(`/panel/attributes/${attributeId}/edit`);
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { attributeId, valueId } = req.params;

        try {
            const record: any = await AttributeValue.findOne({ _id: valueId, attributeId, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE.VALUE.NOT_FOUND);

            const file: any = await MediaManager.AttributeValue.set({ image: '' }, req, res);
            if (file?.error) throw new Error(file.error);

            const sanitizeResult = await sanitize({ ...req?.body, ...file }, {
                value: `required | shorttext`,
                code: `required | shorttext`,
                displayValue: `shorttext`,
                hexCode: `shorttext`,
                description: `longtext`,
                sortOrder: `number | normalize: number`,
                status: `required | in: ACTIVE,INACTIVE`,
                image: `string`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const code = formatKey(body.code, '-', false);
            const existCode: any = await AttributeValue.findOne({ _id: { $ne: valueId }, attributeId, code, deletedAt: null }).lean();
            if (!empty(existCode)) throw new Error(PANEL_MSG.ATTRIBUTE.VALUE.CODE_EXIST);

            if (!empty(body.image) && !empty(record.image)) MediaManager.AttributeValue.remove(record.image);

            await AttributeValue.findByIdAndUpdate(valueId, {
                value: body.value,
                code,
                displayValue: body.displayValue || null,
                hexCode: body.hexCode || null,
                image: body.image || record.image || null,
                description: body.description || null,
                sortOrder: body.sortOrder || 0,
                status: body.status,
            });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE.VALUE.UPDATE_SUCCESS);
            return res.redirect(`/panel/attributes/${attributeId}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE.VALUE.FAIL);
            return res.redirect(`/panel/attributes/${attributeId}/values/${valueId}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        const { attributeId, valueId } = req.params;

        try {
            const record: any = await AttributeValue.findOne({ _id: valueId, attributeId, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.ATTRIBUTE.VALUE.NOT_FOUND);

            const usedInProduct: any = await Product.findOne({
                $or: [
                    { 'attributes.attributeValueId': valueId },
                    { 'variations.attributeValues.attributeValueId': valueId },
                ],
                deletedAt: null,
            }).lean();
            if (!empty(usedInProduct)) throw new Error(PANEL_MSG.ATTRIBUTE.DELETE.IN_USE);

            await AttributeValue.findByIdAndUpdate(valueId, { deletedAt: new Date() });

            req.setFlash?.('success', PANEL_MSG.ATTRIBUTE.VALUE.DELETE_SUCCESS);
            return res.redirect(`/panel/attributes/${attributeId}/edit`);
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.ATTRIBUTE.VALUE.FAIL);
            return res.redirect(`/panel/attributes/${attributeId}/edit`);
        }
    }

}
