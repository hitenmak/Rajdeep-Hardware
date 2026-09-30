export const COMMON = {
    DATA: {
        INVALID: `Invalid data`,
        WRONG: `Something went wrong`,
        FOUND: `Data found`,
        NOT_FOUND: `Data not found`,
    },
}

export const AUTH = {
    TOKEN: {
        NOT_FOUND: `Authorization token not found`,
        INVALID: `Invalid or expired token`,
        SESSION_EXPIRED: `Your session has expired. Please login again`,
        VALID: `Token is valid`,
        REFRESHED: `Token refreshed successfully`,
    },
    LOGIN: {
        INVALID: `Invalid email or password`,
        LOCKED: `Too many failed login attempts. Please try again later`,
        SUCCESS: `Login successfully`,
    },
    LOGOUT: {
        SUCCESS: `Logout successfully`,
    },
    ACCOUNT: {
        PENDING: `Your dealer account is pending approval`,
        REJECTED: `Your dealer account request has been rejected`,
        SUSPENDED: `Your dealer account has been suspended. Please contact support`,
        INACTIVE: `Your dealer account is inactive. Please contact support`,
        NOT_FOUND: `Dealer account not found`,
    },
}

export const PASSWORD = {
    OTP: {
        SEND: `If this email is registered, an OTP has been sent to it`,
        RESEND_TOO_SOON: `Please wait before requesting another OTP`,
        INVALID: `Invalid OTP`,
        EXPIRED: `OTP has expired. Please request a new one`,
        TOO_MANY_ATTEMPTS: `Too many invalid attempts. Please request a new OTP`,
        VERIFIED: `OTP verified successfully`,
        NOT_SEND: `Failed to send OTP email`,
    },
    RESET: {
        SUCCESS: `Password reset successfully. Please login with your new password`,
        INVALID_TOKEN: `Password reset link is invalid or has already been used`,
    },
    CHANGE: {
        SUCCESS: `Password changed successfully`,
        INCORRECT: `Current password is incorrect`,
        SAME_AS_CURRENT: `New password must be different from the current password`,
    },
    NOT_MATCH: `Password and confirm password do not match`,
}

export const CATALOGUE = {
    HOME: {
        FOUND: `Home data found`,
    },
    CATEGORY: {
        FOUND: `Categories found`,
    },
    PRODUCT: {
        FOUND: `Products found`,
        DETAILS_FOUND: `Product details found`,
        NOT_FOUND: `Product not found or no longer available`,
    },
    SEARCH: {
        SUGGESTIONS_FOUND: `Suggestions found`,
        RECENT_FOUND: `Recent searches found`,
        RECENT_REMOVED: `Search removed`,
        RECENT_CLEARED: `Recent searches cleared`,
    },
}

export const CART = {
    FOUND: `Cart found`,
    ITEM_ADDED: `Item added to cart`,
    ITEM_UPDATED: `Cart updated`,
    ITEM_REMOVED: `Item removed from cart`,
    CLEARED: `Cart cleared`,
    ITEM_NOT_FOUND: `Item not found in cart`,
    VARIANT_REQUIRED: `Please choose an option for this product`,
    VARIANT_INVALID: `Selected option is not available`,
    VARIANT_NOT_ALLOWED: `This product has no options`,
    NO_PRICE: `This product is not available for ordering right now`,
    OUT_OF_STOCK: `This product is out of stock`,
    INSUFFICIENT_STOCK: (available: number) => `Only ${available} unit(s) available`,
    TOO_MANY_LINES: (max: number) => `A cart can hold at most ${max} different items`,
    QUANTITY_LIMIT: (max: number) => `Quantity must be between 1 and ${max}`,
    ISSUE: {
        UNAVAILABLE: `No longer available`,
        NO_PRICE: `Not available for ordering`,
        OUT_OF_STOCK: `Out of stock`,
        INSUFFICIENT_STOCK: `Not enough stock`,
    },
}

export const ORDER = {
    CREATED: `Purchase order created successfully`,
    FOUND: `Orders found`,
    DETAILS_FOUND: `Order details found`,
    NOT_FOUND: `Order not found`,
    CART_EMPTY: `Your cart is empty`,
    CART_HAS_ISSUES: `Some items in your cart need attention before placing the order`,
    PRICE_CHANGED: `Prices have changed since you reviewed the order. Please review and confirm again`,
    CHECKOUT_IN_PROGRESS: `Your order is already being placed`,
    TERMS_REQUIRED: `Please accept the procurement terms to place the order`,
    REMARKS_REQUIRED: `Special instructions are required for every purchase order`,
    PDF_READY: `Purchase order PDF ready`,
    PDF_FAILED: `Could not generate the purchase order PDF. Please try again`,
}

export const PROFILE = {
    FOUND: `Profile found`,
    IMAGE_UPDATED: `Profile photo updated`,
    IMAGE_REMOVED: `Profile photo removed`,
    IMAGE_REQUIRED: `Please select a photo to upload`,
}

export const DASHBOARD = {
    FOUND: `Dashboard data found`,
}

export const NOTIFICATION = {
    FOUND: `Notifications found`,
    READ: `Notification marked as read`,
    ALL_READ: `All notifications marked as read`,
    NOT_FOUND: `Notification not found`,
}

export const PREFERENCE = {
    FOUND: `Preferences found`,
    UPDATED: `Preferences updated`,
}

export const CONFIG = {
    SUPPORT_FOUND: `Support details found`,
    FAQ_FOUND: `FAQs found`,
    TERMS_FOUND: `Terms & conditions found`,
}

export const OFFER = {
    FOUND: `Clearance offers found`,
}
