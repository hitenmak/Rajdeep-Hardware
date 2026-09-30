import _ from 'lodash';

// Models
import { Faq } from '../../../models/faq';

// Helpers
import { logError, empty, sanitize, getNum } from '../../../utils';
import Core from '../../../core';

// Others
import { PANEL_MSG } from '../../../common/messages';

//--------------------------------------------------------------
// FAQs shown on the dealer app's Help & Support screen.

const MAX_QUESTION_LENGTH = 300;
const MAX_ANSWER_LENGTH = 5000;

const FAQ_TRACKED_FIELDS = [
    { key: 'question', label: 'Question' },
    { key: 'answer', label: 'Answer' },
    { key: 'sortOrder', label: 'Sort Order' },
    { key: 'status', label: 'Status' },
];

// question/answer are longer than the sanitizer's text presets, so bound them here
const readForm = async (rawBody: any): Promise<any> => {
    const sanitizeResult = await sanitize(rawBody, {
        question: `required`,
        answer: `required`,
        sortOrder: `number | normalize: number`,
        status: `required | in: ACTIVE,INACTIVE`,
    });
    if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
    const body = sanitizeResult.body;

    const question = String(body.question).trim();
    const answer = String(body.answer).trim();
    if (question.length > MAX_QUESTION_LENGTH) throw new Error(`Question must be at most ${MAX_QUESTION_LENGTH} characters`);
    if (answer.length > MAX_ANSWER_LENGTH) throw new Error(`Answer must be at most ${MAX_ANSWER_LENGTH} characters`);

    return { question, answer, sortOrder: getNum(body.sortOrder, 0), status: body.status };
}

export default class FaqController {

    static async list(req: any, res: any): Promise<void> {
        try {
            const page = getNum(req.query?.page, 1) || 1;
            const limit = getNum(req.query?.limit, 10) || 10;

            const query: any = { deletedAt: null };
            if (!empty(req.query?.status)) query.status = req.query.status;
            if (!empty(req.query?.search)) query.question = { $regex: new RegExp(_.escapeRegExp(String(req.query.search)), 'i') };

            const result: any = await Faq.paginate(query, { page, limit, sort: { sortOrder: 1, createdAt: 1 }, lean: true });

            return res.render('panel/faq/list', {
                title: 'FAQs',
                layout: 'panel/layout/main',
                records: result.docs,
                pagination: result,
                filters: req.query || {},
            });
        } catch (e: any) {
            logError(e, '[PANEL-FAQ-LIST] -');
            req.setFlash?.('error', PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/dashboard');
        }
    }

    static createPage(req: any, res: any): void {
        return res.render('panel/faq/form', { title: 'Add FAQ', layout: 'panel/layout/main', record: null });
    }

    static async create(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const values = await readForm(req?.body);
            const record: any = await Faq.create({ ...values, createdBy: panelUser?._id, updatedBy: panelUser?._id });

            await Core.ActivityLog.log({
                req, module: 'FAQ', entityId: record._id, entityLabel: record.question, action: 'CREATE',
                changes: Core.ActivityLog.diff({}, record, FAQ_TRACKED_FIELDS),
                summary: `FAQ "${record.question}" created`,
            });

            req.setFlash?.('success', PANEL_MSG.FAQ.CREATE.SUCCESS);
            return res.redirect('/panel/faqs');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.FAQ.CREATE.FAIL);
            return res.redirect('/panel/faqs/create');
        }
    }

    static async editPage(req: any, res: any): Promise<void> {
        try {
            const record: any = await Faq.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.FAQ.DETAILS.NOT_FOUND);
            return res.render('panel/faq/form', { title: 'Edit FAQ', layout: 'panel/layout/main', record });
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.COMMON.DATA.WRONG);
            return res.redirect('/panel/faqs');
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const record: any = await Faq.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.FAQ.DETAILS.NOT_FOUND);

            const values = await readForm(req?.body);
            await Faq.findByIdAndUpdate(req.params.id, { ...values, updatedBy: panelUser?._id });

            const changes = Core.ActivityLog.diff(record, values, FAQ_TRACKED_FIELDS);
            await Core.ActivityLog.log({
                req, module: 'FAQ', entityId: record._id, entityLabel: values.question, action: 'UPDATE',
                changes, summary: changes.length ? undefined : `FAQ "${values.question}" updated (no tracked fields changed)`,
            });

            req.setFlash?.('success', PANEL_MSG.FAQ.UPDATE.SUCCESS);
            return res.redirect('/panel/faqs');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.FAQ.UPDATE.FAIL);
            return res.redirect(`/panel/faqs/${req.params.id}/edit`);
        }
    }

    static async delete(req: any, res: any): Promise<void> {
        try {
            const record: any = await Faq.findOne({ _id: req.params.id, deletedAt: null }).lean();
            if (empty(record)) throw new Error(PANEL_MSG.FAQ.DETAILS.NOT_FOUND);

            await Faq.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
            await Core.ActivityLog.log({
                req, module: 'FAQ', entityId: record._id, entityLabel: record.question, action: 'DELETE',
                summary: `FAQ "${record.question}" deleted`,
            });

            req.setFlash?.('success', PANEL_MSG.FAQ.DELETE.SUCCESS);
            return res.redirect('/panel/faqs');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.FAQ.DELETE.FAIL);
            return res.redirect('/panel/faqs');
        }
    }

}
