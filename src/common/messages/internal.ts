export const COMMON = {
    DATA: {
        INVALID: `Invalid data`,
        WRONG: `Something went wrong`,
        FOUND: `Data found`,
        NOT_FOUND: `Data not found`,
        INVALID_NUMBER: `Only numeric values are allowed`,
    },
}

export const SETTING = {
    DETAILS: {
        FOUND: `Setting data found`,
        NOT_FOUND: `Setting data not found`,
    },
    SET: {
        SUCCESS: `Setting data saved successfully`,
        FAILED: `Failed to save setting data`,
    },
}

export const API_CLIENT = {
    HEALTH_CHECK: {
        HEALTHY: `API client is healthy. Everything is working fine`,
        DEATH: `API client is down. Please contact an engineer immediately`,
    },
}

export const MAIL = {
    NOT_SEND: `Failed to send email`,
    SEND: `Email sent successfully`,
    EMAIL_ADDRESS_NOT_FOUND: `Email address not found`,
}

export const OTP = {
    NOT_GENERATE: `OTP not generated`,
    NOT_SET: `OTP not set`,
    SEND: `OTP sent successfully`,
    INVALID: `Invalid OTP`,
    EXPIRED: `OTP has expired`,
    VERIFIED: `OTP verified successfully`,
}

export const AUTH = {
    SIGN_UP: {
        REVIEW: `Thanks for signing up! Your account is under review. You will get access once it is approved`,
        SUCCESS: `Sign-up successful`,
        EMAIL_VERIFICATION_MAIL: `Verification email sent successfully`,
    },
    LOGIN: {
        INVALID: `Invalid email or password`,
        SUCCESS: `Login successfully`,
    },
    SOCIAL_LOGIN: {
        URL_GENERATE: `URL generated successfully`,
        AUTH_CODE: `Auth code is required`,
        UNABLE_ACCESS_TOKEN: `Unable to get access token`,
    },
    LOGOUT: {
        SUCCESS: `Logout successfully`,
        FAIL: `Failed to logout`,
    },
    FORGOT_PASSWORD: {
        INVALID_EMAIL: `This email is not registered`,
        NOT_UPDATE: `Password has not updated`,
        CONFIRM_PASSWORD_NOT_MATCH: `Password and confirm password do not match`,
        SUCCESS: `Password changed successfully`,
    },
}

export const MIDDLEWARE_APP_AUTH = {
    TOKEN: {
        NOT_FOUND: `Token not found`,
        INVALID: `Invalid token`,
        INVALID_PAYLOAD: `Invalid token payload`,
    },
    AUTH: {
        USER_NOT_APPROVED: `Your account is under review. Access will be available after approval`,
        USER_NOT_FOUND: `User not found`,
        UNVERIFIED_EMAIL: `Your email address is not verified. Please verify your email to proceed`,
    },
}

export const PROFILE = {
    DETAILS: {
        FOUND: `User profile found`,
        NOT_FOUND: `User profile not found`,
    },
    UPDATE: {
        SUCCESS: `User profile updated successfully`,
        FAIL: `Failed to update user profile`,
    },
    UPLOAD: {
        SUCCESS: `Profile image uploaded successfully`,
        FAIL: `Failed to upload profile image`,
        UPLOAD_RESET: `Profile image reset successfully`,
    },
    PASSWORD: {
        NOT_MATCH: `New password does not match confirm password`,
        INCORRECT: `Current password is incorrect`,
        INVALID_TOKEN: `Invalid token`,
        SUCCESS: `Password set successfully`,
        FAIL: `Failed to update password`,
    },
    DELETE: {
        SUCCESS: `Profile deleted successfully`,
        NOT_DELETED: `This user is a master admin and cannot be deleted`,
        FAIL: `Failed to delete profile`,
    },
}
