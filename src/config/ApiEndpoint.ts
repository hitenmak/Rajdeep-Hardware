// Others
import Config from '../config';

//--------------------------------------------------------------

export default {

    WEB_APP: {
        CURRENCY_RATE_URL: `https://api.exchangerate-api.com/v4/latest`,

        LOGIN_MAIL_URL: Config.WEB_APP.WEB_URL,
        PASSWORD_SET_URL: `${Config.WEB_APP.WEB_URL}/set-password/?token=`,

        LOGIN_MEMBER_URL: `${Config.WEB_APP.SEND_PARCLE_URL}/login/`,
        SOCIAL_LOGIN_MEMBER_URL: `${Config.WEB_APP.SEND_PARCLE_URL}/social-login/?token=`,
        ORDER_PAYMENT_URL: `${Config.WEB_APP.SEND_PARCLE_URL}/payment/?token=`,
    },

}
