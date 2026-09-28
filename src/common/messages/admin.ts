export const COMMON = {
    DATA: {
        INVALID: `Invalid data`,
        WRONG: `Something went wrong`,
        FOUND: `Data found`,
        NOT_FOUND: `Data not found`,
        INVALID_NUMBER: `Only numeric values are allowed`,
    },
}

export const DASHBOARD = {
    DETAILS: {
        FOUND: `Data found`,
    },
}

export const COUNTRY = {
    DETAILS: {
        NOT_FOUND: `Country not found`,
    },
    LIST: {
        SUCCESS: `Countries retrieved successfully`,
        ERROR: `Failed to retrieve countries`,
    },
}

export const STATE = {
    DETAILS: {
        NOT_FOUND: `State not found`,
    },
    LIST: {
        SUCCESS: `States retrieved successfully`,
        ERROR: `Failed to retrieve states`,
    },
}

export const ROLE_PERMISSION = {
    DETAILS: {
        LOGIN_TYPE_INVALID: `Invalid login type`,
        NOT_FOUND: `Role permission not found`,
        DENIED: `Permission denied`,
    },
    UPDATE: {
        DEPARTMENT_EXIST: `Role and permission for this department already exist`,
        SUCCESS: `Role and permission updated successfully`,
        FAIL: `Failed to update role and permission`,
    },
    DELETE: {
        SUCCESS: `Role and permission deleted successfully`,
        DELETE_NOT_ALLOWED: `This role is assigned to a user and cannot be deleted`,
        FAIL: `Failed to delete role and permission`,
    },
}

export const USER = {
    ACCOUNT: {
        NOT_FOUND: `User not found`,
        CREATE_SUCCESS: `User created successfully`,
        EMAIL_EXIST: `This email is already registered`,
    },
    MFA2FA: {
        QR_CODE_GENERATED: `QR code generated successfully`,
        INVALID: `Invalid OTP`,
        RE_GENERATE: `Please regenerate two-factor authentication`,
        ACTIVATED: `Two-factor authentication has been activated`,
    },
    UPDATE: {
        SUCCESS: `User updated successfully`,
        FAIL: `Failed to update user`,
    },
    UPLOAD: {
        SUCCESS: `Profile image uploaded successfully`,
        FAIL: `Failed to upload profile image`,
        UPLOAD_RESET: `Profile image reset successfully`,
    },
    STATUS: {
        SUCCESS: `User status updated successfully`,
        FAIL: `Failed to update user status`,
    },
    DELETE: {
        SUCCESS: `User deleted successfully`,
        FAIL: `Failed to delete user`,
    },
}

export const BANK = {
    SUCCESS: `Bank details saved successfully`,
    FAIL: `Failed to save bank details`,
    BANK_NOT_FOUND: `Bank name not recognized`,
}

export const TRANSACTION_HISTORY = {
    DEPOSIT: {
        SUCCESS: `Deposit amount credited successfully`,
        FAIL: `Failed to credit deposit amount`,
    },
    WITHDRAW: {
        INSUFFICIENT_BALANCE: `Your wallet balance is insufficient`,
        REQUEST_SUCCESS: `Withdrawal request generated successfully`,
        SUCCESS: `Amount withdrawn successfully`,
    },
}

export const REPORT = {
    USER: {
        DETAILS: {
            NOT_FOUND: `User not found`,
        }
    },
    EXPORT: {
        SUCCESS: `Report exported successfully`,
        FAIL: `Failed to export report`,
    },
}
