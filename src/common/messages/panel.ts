export const COMMON = {
    DATA: {
        FOUND: `Data found`,
        NOT_FOUND: `Data not found`,
        WRONG: `Something went wrong`,
        INVALID: `Invalid data`,
    },
}

export const AUTH = {
    LOGIN: {
        INVALID: `Invalid email or password`,
        INACTIVE: `Your account has been deactivated. Please contact the administrator`,
        NOT_APPROVED: `Your account is under review. Access will be available after approval`,
        LOCKED: `Too many failed login attempts. Your account is temporarily locked. Please try again later`,
        SUCCESS: `Login successful`,
    },
    LOGOUT: {
        SUCCESS: `Logout successful`,
    },
    FORGOT_PASSWORD: {
        INVALID_EMAIL: `This email is not registered`,
        SUCCESS: `Password reset successfully. Please login with your new password`,
    },
    CHANGE_PASSWORD: {
        INCORRECT: `Current password is incorrect`,
        NOT_MATCH: `New password and confirm password do not match`,
        SUCCESS: `Password changed successfully`,
    },
    SESSION: {
        EXPIRED: `Your session has expired. Please login again`,
    },
}

export const ROLE_PERMISSION = {
    DETAILS: {
        NOT_FOUND: `Role not found`,
        DENIED: `You do not have permission to perform this action`,
    },
    UPDATE: {
        DEPARTMENT_EXIST: `A role for this department already exists`,
        SUCCESS: `Role and permissions saved successfully`,
        FAIL: `Failed to save role and permissions`,
    },
    DELETE: {
        SUCCESS: `Role deleted successfully`,
        NOT_ALLOWED: `This role is assigned to a user and cannot be deleted`,
        MASTER_NOT_ALLOWED: `The Super Admin role cannot be deleted`,
        FAIL: `Failed to delete role`,
    },
}

export const USER = {
    ACCOUNT: {
        NOT_FOUND: `User not found`,
        CREATE_SUCCESS: `User created successfully`,
        EMAIL_EXIST: `This email is already registered`,
        SELF_ACTION_NOT_ALLOWED: `You cannot perform this action on your own account`,
    },
    UPDATE: {
        SUCCESS: `User updated successfully`,
        FAIL: `Failed to update user`,
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

export const DEALER = {
    DETAILS: {
        NOT_FOUND: `Dealer not found`,
        CODE_EXIST: `This dealer code already exists`,
        EMAIL_EXIST: `This email is already registered to another dealer`,
    },
    CREATE: {
        SUCCESS: `Dealer created successfully`,
        FAIL: `Failed to create dealer`,
    },
    UPDATE: {
        SUCCESS: `Dealer updated successfully`,
        FAIL: `Failed to update dealer`,
    },
    DELETE: {
        SUCCESS: `Dealer deleted successfully`,
        FAIL: `Failed to delete dealer`,
    },
    APPROVAL: {
        APPROVED: `Dealer approved successfully`,
        REJECTED: `Dealer rejected successfully`,
        SUSPENDED: `Dealer suspended successfully`,
        REACTIVATED: `Dealer reactivated successfully`,
        FAIL: `Failed to update dealer approval status`,
    },
    PRICING: {
        CREATE_SUCCESS: `Dealer price added successfully`,
        UPDATE_SUCCESS: `Dealer price updated successfully`,
        DELETE_SUCCESS: `Dealer price removed successfully`,
        FAIL: `Failed to save dealer price`,
    },
    DISCOUNT: {
        CREATE_SUCCESS: `Dealer discount added successfully`,
        UPDATE_SUCCESS: `Dealer discount updated successfully`,
        DELETE_SUCCESS: `Dealer discount removed successfully`,
        FAIL: `Failed to save dealer discount`,
    },
}

export const PURCHASE_ORDER = {
    DETAILS: {
        NOT_FOUND: `Purchase order not found`,
        NO_ITEMS: `At least one item is required`,
        DENIED: `You do not have access to this purchase order`,
    },
    CREATE: {
        SUCCESS: `Purchase order created successfully`,
        FAIL: `Failed to create purchase order`,
    },
    UPDATE: {
        SUCCESS: `Purchase order updated successfully`,
        FAIL: `Failed to update purchase order`,
    },
    DELETE: {
        SUCCESS: `Purchase order deleted successfully`,
        NOT_ALLOWED: `Only a pending purchase order can be deleted`,
        FAIL: `Failed to delete purchase order`,
    },
    REVIEW: {
        SUCCESS: `Purchase order review decision saved successfully`,
        FAIL: `Failed to save review decision`,
    },
    STATUS: {
        SUCCESS: `Purchase order status updated successfully`,
        INVALID_TRANSITION: `This status change is not allowed from the current status`,
        DELIVERY_IMAGE_REQUIRED: `Upload at least one delivery photo before marking this order delivered`,
        FAIL: `Failed to update purchase order status`,
    },
    ASSIGNMENT: {
        PACKAGE_MANAGER_SUCCESS: `Package Manager assigned successfully`,
        DELIVERY_MANAGER_SUCCESS: `Delivery Manager assigned successfully`,
        NOT_APPROVED: `Assign a Package Manager only after the order is approved`,
        FAIL: `Failed to save assignment`,
    },
    DELIVERY_IMAGE: {
        UPLOAD_SUCCESS: `Delivery photo uploaded successfully`,
        DELETE_SUCCESS: `Delivery photo removed successfully`,
        FAIL: `Failed to save delivery photo`,
    },
}

export const SETTING = {
    UPDATE: {
        SUCCESS: `Settings updated successfully`,
        FAIL: `Failed to update settings`,
    },
    BULK_PRICE: {
        NO_PRODUCTS: `No products with a set price were found in this category`,
        FAIL: `Failed to apply the bulk price adjustment`,
    },
}

export const CATEGORY = {
    DETAILS: {
        NOT_FOUND: `Category not found`,
        NAME_EXIST: `This name already exists at this level`,
        MAX_DEPTH: `A category can be nested at most 3 levels deep (Category > Subcategory > Sub-subcategory)`,
    },
    CREATE: {
        SUCCESS: `Category created successfully`,
        FAIL: `Failed to create category`,
    },
    UPDATE: {
        SUCCESS: `Category updated successfully`,
        FAIL: `Failed to update category`,
    },
    DELETE: {
        SUCCESS: `Category deleted successfully`,
        HAS_SUBCATEGORY: `This category has child categories. Please remove or reassign them before deleting`,
        HAS_PRODUCT: `This category has products. Please remove or reassign them before deleting`,
        FAIL: `Failed to delete category`,
    },
}

export const ATTRIBUTE = {
    DETAILS: {
        NOT_FOUND: `Attribute not found`,
        CODE_EXIST: `This attribute code already exists`,
    },
    CREATE: {
        SUCCESS: `Attribute created successfully`,
        FAIL: `Failed to create attribute`,
    },
    UPDATE: {
        SUCCESS: `Attribute updated successfully`,
        FAIL: `Failed to update attribute`,
    },
    DELETE: {
        SUCCESS: `Attribute deleted successfully`,
        IN_USE: `This attribute is used in an attribute set and cannot be deleted`,
        FAIL: `Failed to delete attribute`,
    },
    VALUE: {
        NOT_FOUND: `Attribute value not found`,
        CODE_EXIST: `This value code already exists for the attribute`,
        CREATE_SUCCESS: `Attribute value added successfully`,
        UPDATE_SUCCESS: `Attribute value updated successfully`,
        DELETE_SUCCESS: `Attribute value deleted successfully`,
        FAIL: `Failed to save attribute value`,
    },
}

export const ATTRIBUTE_SET = {
    DETAILS: {
        NOT_FOUND: `Attribute set not found`,
        CODE_EXIST: `This attribute set code already exists`,
    },
    CREATE: {
        SUCCESS: `Attribute set created successfully`,
        FAIL: `Failed to create attribute set`,
    },
    UPDATE: {
        SUCCESS: `Attribute set updated successfully`,
        FAIL: `Failed to update attribute set`,
    },
    DELETE: {
        SUCCESS: `Attribute set deleted successfully`,
        IN_USE: `This attribute set is assigned to a category and cannot be deleted`,
        FAIL: `Failed to delete attribute set`,
    },
}

export const PRODUCT = {
    DETAILS: {
        NOT_FOUND: `Product not found`,
        SLUG_EXIST: `This URL slug is already in use`,
        SKU_EXIST: `This SKU is already in use`,
    },
    CREATE: {
        SUCCESS: `Product created successfully`,
        FAIL: `Failed to create product`,
    },
    UPDATE: {
        SUCCESS: `Product updated successfully`,
        FAIL: `Failed to update product`,
    },
    DELETE: {
        SUCCESS: `Product deleted successfully`,
        FAIL: `Failed to delete product`,
    },
    VARIATION: {
        BULK_SUCCESS: `Variations updated successfully`,
        FAIL: `Failed to save variations`,
    },
}

export const FAQ = {
    DETAILS: {
        NOT_FOUND: `FAQ not found`,
    },
    CREATE: {
        SUCCESS: `FAQ created successfully`,
        FAIL: `Failed to create FAQ`,
    },
    UPDATE: {
        SUCCESS: `FAQ updated successfully`,
        FAIL: `Failed to update FAQ`,
    },
    DELETE: {
        SUCCESS: `FAQ deleted successfully`,
        FAIL: `Failed to delete FAQ`,
    },
}
