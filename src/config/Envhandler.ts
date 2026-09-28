// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../utils';

//--------------------------------------------------------------

export default (): void => {
    let isError = false;

    const REQUIRED_ENV_VARIABLES = [
        'APP_KEY',
        'APP_URL',

        'APP_MODE',
        'APP_MASTER_PASSWORD',
        'APP_MASTER_OTP',

        'SERVER_PORT',
        'TZ',

        'MONGO_CONNECTION_STRING',

        'AWS_S3_ACCESS_KEY',
        'AWS_S3_SECRET_KEY',
        'AWS_S3_BUCKET_NAME',
        'AWS_S3_REGION',

        'DEV_AWS_S3_ACCESS_KEY',
        'DEV_AWS_S3_SECRET_KEY',
        'DEV_AWS_S3_BUCKET_NAME',
        'DEV_AWS_S3_REGION',

        'MAIL_PORT',
        'MAIL_ENCRYPTION',
        'MAIL_USER_NAME',
        'MAIL_USER_PASSWORD',
        'MAIL_HOST',
        'MAIL_FROM',

        'TEST_PAY_STACK_SECRET_KEY',
        'LIVE_PAY_STACK_SECRET_KEY',

        'MARKET_PLACE_ACCESS_TOKEN',

        'MAP_BOX_ACCESS_TOKEN',

        'GOOGLE_MAP_API_KEY',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',

        'FACEBOOK_CLIENT_ID',
        'FACEBOOK_CLIENT_SECRET',

        'IP_INFO_TOKEN',

        'TEST_WHATSAPP_PHONE_NUMBER_ID',
        'TEST_WHATSAPP_BUSINESS_ACCOUNT_ID',
        'TEST_WHATSAPP_ACCESS_TOKEN',

        'LIVE_WHATSAPP_PHONE_NUMBER_ID',
        'LIVE_WHATSAPP_BUSINESS_ACCOUNT_ID',
        'LIVE_WHATSAPP_ACCESS_TOKEN',

        'EXPRESS_SESSION_SECRET',

        'JWT_SECRET_KEY',

        // 'ALLOW_ORIGIN',
    ];


    REQUIRED_ENV_VARIABLES.forEach(k => {
        if (empty(process.env[k])) {
            isError = true;
            logError(`[ENV] - variables not defined: ${k}`);
        }
    });
    if (isError) process.exit(0);
    logSuccess(`[ENV] - variables satisfied...`);
}