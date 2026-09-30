// Models
import { Setting } from '../../../models/setting';

// Helpers
import { empty, getStr } from '../../../utils';
import MediaManager from '../../../services/media';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

export default class Config {

    // "Help & Support" + "About": everything comes from admin Settings, nothing is hard-coded in the app
    static async support(req: any, res: any): Promise<void> {
        try {
            const setting: any = await Setting.findOne({}).select('general contactDetails branding appDetails').lean();
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

}
