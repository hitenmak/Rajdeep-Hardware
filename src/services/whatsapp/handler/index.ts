import axios from 'axios';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getError } from '../../../utils';

// Others
import Config from '../../../config';

// Interfaces
import { IHelperError, IWhatsappRet } from '../interfaces';

//--------------------------------------------------------------

export default async (payload: any): Promise<IWhatsappRet | IHelperError> => {
    const ERROR_KEY = 'WHATSAPP';

    try {
        let components = [];
        if (!empty(payload?.bodyParameters)) components.push({ type: 'body', parameters: payload?.bodyParameters });
        if (!empty(payload?.buttonParameters)) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: payload?.buttonParameters });

        const response = await axios.post(`https://graph.facebook.com/v22.0/${Config.WHATSAPP.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: payload?.receiverPhoneNumber, // receiver phone number (9199xxxxxxxx)
                type: 'template',
                template: {
                    name: payload?.templateName,
                    language: {
                        code: 'en_US',
                    },
                    components
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${Config.WHATSAPP.ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return { error: '', data: response?.data };
    } catch (e: any) {
        return { error: getError(e), errorKey: ERROR_KEY };
    }
}
