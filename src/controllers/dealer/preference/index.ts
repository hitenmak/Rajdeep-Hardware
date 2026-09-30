// Models
import { Dealer } from '../../../models/dealer';

// Helpers
import { validate } from '../common/validate';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

// Interfaces
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
];

const TOGGLES = ['pushNotifications', 'emailNotifications', 'smsAlerts'];

const format = (dealer: IObj): IObj => {
    const p = dealer?.preferences || {};
    return {
        pushNotifications: p.pushNotifications !== false,
        emailNotifications: p.emailNotifications !== false,
        smsAlerts: !!p.smsAlerts,
        language: p.language || 'en',
        languages: SUPPORTED_LANGUAGES,
    };
}

export default class Preference {

    static async details(req: any, res: any): Promise<void> {
        try {
            return res.status(200).send({ status: true, message: DEALER_MSG.PREFERENCE.FOUND, data: format(req.authDealer) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-PREFERENCE-DETAILS] -');
        }
    }

    // partial update: send only the toggles that changed
    static async update(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                pushNotifications: `boolean`,
                emailNotifications: `boolean`,
                smsAlerts: `boolean`,
                language: `in: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(',')}`,
            });

            const set: IObj = {};
            TOGGLES.forEach((key) => { if (typeof body[key] === 'boolean') set[`preferences.${key}`] = body[key]; });
            if (body.language) set['preferences.language'] = body.language;
            if (!Object.keys(set).length) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.COMMON.DATA.INVALID);

            const dealer: any = await Dealer.findByIdAndUpdate(authDealer._id, { $set: set }, { new: true }).select('preferences').lean();
            return res.status(200).send({ status: true, message: DEALER_MSG.PREFERENCE.UPDATED, data: format(dealer) });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-PREFERENCE-UPDATE] -');
        }
    }

}
