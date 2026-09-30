export const ROOT_DIR = `${__dirname}/..`;
export const ROOT_DIR_PATH = process.cwd();

export const PAGINATION_OPTIONS = {
    limit: 10, // if set limit 0 then return all records
    sort: { _id: -1 },
    page: 1,
    lean: true,
    totalPages: true,
}

export const QR_CODE = {
    COLOR: '#000000',
    SIZE: 11,
}

export const OTP = {
    LENGTH: 6,
    EXPIRE_TIME_IN_SECOND: 300,
}

export const PASSWORD = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 24,
}

export const BASIC_AUTH_ROUTE_GROUPS = {
    SIGN_UP_OTP_VERIFICATION: ['auth/sign-up/otp/verify', 'auth/sign-up/otp/resend'],
    FORGOT_PASSWORD_OTP_VERIFICATION: ['auth/password/otp/verify', 'auth/password/otp/resend'],
    FORGOT_PASSWORD_UPDATE: ['auth/password/update']
}

export const PANEL_AUTH = {
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    LOCK_DURATION_IN_MINUTE: 15,
    IDLE_SESSION_TIMEOUT_IN_MINUTE: 60,
}

export const DEALER_AUTH = {
    ACCESS_TOKEN_EXPIRES_IN_SECOND: 60 * 60 * 24, // 1 day
    REFRESH_TOKEN_EXPIRES_IN_DAY: 30, // "Remember me" session; sliding - renewed on every refresh
    SHORT_REFRESH_TOKEN_EXPIRES_IN_DAY: 1, // session without "Remember me"
    PASSWORD_OTP_TOKEN_EXPIRES_IN_SECOND: 60 * 15,
    PASSWORD_RESET_TOKEN_EXPIRES_IN_SECOND: 60 * 10,

    OTP_LENGTH: 4, // per dealer app design; admin OTP stays at OTP.LENGTH
    OTP_MAX_VERIFY_ATTEMPTS: 5,
    OTP_RESEND_INTERVAL_IN_SECOND: 45, // matches the app's resend countdown

    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    LOCK_DURATION_IN_MINUTE: 15,

    // separate audiences keep admin, dealer-access and password-flow tokens non-interchangeable
    AUDIENCE: {
        ACCESS: 'dealer',
        PASSWORD_OTP: 'dealer:password-otp',
        PASSWORD_RESET: 'dealer:password-reset',
    },
}
