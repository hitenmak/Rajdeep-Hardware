import path from 'path';

//--------------------------------------------------------------

const isProdApp = process.env.APP_MODE === 'prod'; // dev, stage, prod
const BASE_ROOT_DIR = process.cwd();

const config = {

    APP: {
        NAME: 'Legally Shipping Logistic',
        SERVER_PORT: process.env.SERVER_PORT || '',
        MODE: process.env.APP_MODE || '', // dev, stage, prod
        URL: process.env.APP_URL,
        ROOT_DIR: path.join(BASE_ROOT_DIR, 'src'),
        BASE_ROOT_DIR,
        KEY: process.env.APP_KEY || '', // 100
        MASTER_PASSWORD: process.env.APP_MASTER_PASSWORD || '',
        MASTER_OTP: process.env.APP_MASTER_OTP || '',
    },

    WEB_APP: {
        WEB_URL: '',
        SEND_PARCLE_URL: `https://logistics.legallyng.com`,
    },

    DATABASE: {
        CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING || '',
        CONNECT_TIMEOUT: 5000,
        RECONNECT_DELAY: 2000 // reconnect try after 2s
    },

    STORAGE: {
        IS_LOCAL: process.env.APP_MODE === 'dev' ? true : false,
        LOCAL_FOLDER: 'storage',
        MAX_FILE_SIZE_MB: 50,
    },
    AWS_S3_BUCKET: isProdApp ? { // Prod
        ACCESS_KEY: process.env.AWS_S3_ACCESS_KEY || '',
        SECRET_KEY: process.env.AWS_S3_SECRET_KEY || '',
        BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || '',
        REGION: process.env.AWS_S3_REGION || '',
        BASE_URL: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`,
    } : { // Dev
        ACCESS_KEY: process.env.DEV_AWS_S3_ACCESS_KEY || '',
        SECRET_KEY: process.env.DEV_AWS_S3_SECRET_KEY || '',
        BUCKET_NAME: process.env.DEV_AWS_S3_BUCKET_NAME || '',
        REGION: process.env.DEV_AWS_S3_REGION || '',
        BASE_URL: `https://${process.env.DEV_AWS_S3_BUCKET_NAME}.s3.${process.env.DEV_AWS_S3_REGION}.amazonaws.com`,
    },

    APP_SUPPORT: {
        EMAIL: 'help@legallyshippinglogistic.io',
    },

    MAIL: {
        SMTP_PORT: process.env.MAIL_PORT,
        ENCRYPTION: process.env.MAIL_ENCRYPTION,
        USER_NAME: process.env.MAIL_USER_NAME,
        USER_PASSWORD: process.env.MAIL_USER_PASSWORD,
        HOST: process.env.MAIL_HOST,
        FROM: process.env.MAIL_FROM,
    },

    CORS: {
        ALLOW_ORIGIN: process.env.ALLOW_ORIGIN ? process.env.ALLOW_ORIGIN.split(',') : [],
    },

    JWT: {
        SECRET_KEY: process.env.JWT_SECRET_KEY || '',  // 100
        EXPIRES_IN: '9999999999d',
    },

    EXPRESS_SESSION: {
        secret: process.env.EXPRESS_SESSION_SECRET || '', // 100
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1 week
    },

    IP_INFO_TOKEN: process.env.IP_INFO_TOKEN, // my account

    PAY_STACK_SECRET_KEY: isProdApp ? process.env.LIVE_PAY_STACK_SECRET_KEY : process.env.TEST_PAY_STACK_SECRET_KEY,

    MARKET_PLACE_ACCESS_TOKEN: process.env.MARKET_PLACE_ACCESS_TOKEN,

    MAP_BOX_ACCESS_TOKEN: process.env.MAP_BOX_ACCESS_TOKEN,

    GOOGLE: {
        MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY,
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI: `${process.env.APP_URL}/admin/auth/login-with-google/callback`
    },

    FACEBOOK: {
        CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
        CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET,
        REDIRECT_URI: `${process.env.APP_URL}/admin/auth/login-with-facebook/callback`
    },

    WHATSAPP: {
        PHONE_NUMBER_ID: isProdApp ? process.env.LIVE_WHATSAPP_PHONE_NUMBER_ID : process.env.TEST_WHATSAPP_PHONE_NUMBER_ID,
        BUSINESS_ACCOUNT_ID: isProdApp ? process.env.LIVE_WHATSAPP_BUSINESS_ACCOUNT_ID : process.env.TEST_WHATSAPP_BUSINESS_ACCOUNT_ID,
        ACCESS_TOKEN: isProdApp ? process.env.LIVE_WHATSAPP_ACCESS_TOKEN : process.env.TEST_WHATSAPP_ACCESS_TOKEN,
    }
};
//--------------------------------------------------------------
export default config;