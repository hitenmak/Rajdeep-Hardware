// Models
import { Setting } from '../../../models/setting';
import { Faq } from '../../../models/faq';

// Helpers
import { empty, getStr } from '../../../utils';
import MediaManager from '../../../services/media';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

// null when admin hasn't filled it in, so the app can hide the section
export const bankDetails = (setting: any): any => {
    const b = setting?.bankDetails || {};
    if (empty(b.bankName) && empty(b.accountNumber) && empty(b.upiId)) return null;
    return {
        bankName: getStr(b.bankName) || null,
        accountName: getStr(b.accountName) || null,
        accountNumber: getStr(b.accountNumber) || null,
        ifscCode: getStr(b.ifscCode) || null,
        branch: getStr(b.branch) || null,
        upiId: getStr(b.upiId) || null,
    };
}

export default class Config {

    // "Help & Support" + "About": everything comes from admin Settings, nothing is hard-coded in the app
    static async support(req: any, res: any): Promise<void> {
        try {
            const setting: any = await Setting.findOne({}).select('general contactDetails branding appDetails bankDetails').lean();
            const contact = setting?.contactDetails || {};
            const phone = [getStr(contact.phoneCode), getStr(contact.phone)].filter(Boolean).join(' ');
            const location = contact.location || {};

            const data = {
                company: {
                    name: getStr(setting?.general?.companyName) || 'Rajdeep Hardware',
                    logoUrl: empty(setting?.branding?.logoFull) ? null : MediaManager.Setting.get(setting.branding.logoFull),
                    website: getStr(contact.website) || null,
                    address: [location.address1, location.address2, location.city, location.state, location.postcode, location.country].map(getStr).filter(Boolean).join(', ') || null,
                },
                support: {
                    phone: phone || null,
                    // WhatsApp link built from the support number (digits only, country code included)
                    whatsappUrl: phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : null,
                    email: getStr(contact.email) || null,
                },
                bankDetails: bankDetails(setting),
                app: {
                    android: { latestVersion: getStr(setting?.appDetails?.androidApp?.latestVersion) || null, appLink: getStr(setting?.appDetails?.androidApp?.appLink) || null },
                    ios: { latestVersion: getStr(setting?.appDetails?.iosApp?.latestVersion) || null, appLink: getStr(setting?.appDetails?.iosApp?.appLink) || null },
                },
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.CONFIG.SUPPORT_FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CONFIG-SUPPORT] -');
        }
    }

    // "FAQs - Common Qs & As", managed in the panel (Administration > FAQs)
    static async faq(req: any, res: any): Promise<void> {
        try {
            const records = await Faq.find({ status: 'ACTIVE', deletedAt: null }).select('question answer').sort({ sortOrder: 1, createdAt: 1 }).lean();
            const data = { records: records.map((f: any) => ({ id: getStr(f._id), question: getStr(f.question), answer: getStr(f.answer) })) };
            return res.status(200).send({ status: true, message: DEALER_MSG.CONFIG.FAQ_FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CONFIG-FAQ] -');
        }
    }

    // managed in the panel (Settings > Terms & Conditions)
    static async terms(req: any, res: any): Promise<void> {
        try {
            const setting: any = await Setting.findOne({}).select('legal').lean();
            const data = {
                content: getStr(setting?.legal?.termsAndConditions) || null,
                updatedAt: setting?.legal?.updatedAt || null,
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.CONFIG.TERMS_FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CONFIG-TERMS] -');
        }
    }

}
