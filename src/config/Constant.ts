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
