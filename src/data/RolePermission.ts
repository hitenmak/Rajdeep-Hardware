
export default {

    'DASHBOARD': {
        label: 'Dashboard',
        privileges: {
            'VIEW': {
                label: 'View',
                isPermitted: false
            },
        },
    },

    'BANK-DETAILS': {
        label: 'Bank Details',
        privileges: {
            'VIEW': {
                label: 'View',
                isPermitted: false
            }
        },
    },

    'EARNING': {
        label: 'Earning',
        privileges: {
            'VIEW': {
                label: 'View',
                isPermitted: false
            }
        },
    },

    'USER': {
        label: 'User',
        privileges: {
            'VIEW': {
                label: 'View',
                isPermitted: false
            },
            'CREATE': {
                label: 'Create',
                isPermitted: false
            },
            'UPDATE': {
                label: 'Update',
                isPermitted: false
            },
            'STATUS': {
                label: 'Status',
                isPermitted: false
            },
            'DELETE': {
                label: 'Delete',
                isPermitted: false
            }
        },
    },

    'ROLE-PERMISSION': {
        label: 'Roles & Permissions',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    // Categories are a single self-referencing 3-level tree (Category >
    // Subcategory > Sub-subcategory) - one permission module covers every level.
    'CATEGORY': {
        label: 'Categories',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'ATTRIBUTE': {
        label: 'Attributes',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'ATTRIBUTE-SET': {
        label: 'Attribute Sets',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'PRODUCT': {
        label: 'Products',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
            'IMPORT': { label: 'Import', isPermitted: false },
            'EXPORT': { label: 'Export', isPermitted: false },
        },
    },

    'PRODUCT-IMAGE': {
        label: 'Product Images',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'INVENTORY': {
        label: 'Inventory',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'PRICING': {
        label: 'Pricing',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'DEALER': {
        label: 'Dealers',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
            'EXPORT': { label: 'Export', isPermitted: false },
        },
    },

    'PURCHASE-ORDER': {
        label: 'Purchase Orders',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
            'CHANGE-STATUS': { label: 'Change Status', isPermitted: false },
            'EXPORT': { label: 'Export', isPermitted: false },
        },
    },

    'ASSIGN-PACKAGE-MANAGER': {
        label: 'Assign Package Manager',
        privileges: {
            'ASSIGN': { label: 'Assign', isPermitted: false },
        },
    },

    'ASSIGN-DELIVERY-MANAGER': {
        label: 'Assign Delivery Manager',
        privileges: {
            'ASSIGN': { label: 'Assign', isPermitted: false },
        },
    },

    'DELIVERY-PICTURE': {
        label: 'Delivery Picture',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'UPLOAD': { label: 'Upload', isPermitted: false },
        },
    },

    'REPORT': {
        label: 'Reports',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'EXPORT': { label: 'Export', isPermitted: false },
        },
    },

    'SETTING': {
        label: 'Settings',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
        },
    },

    'FAQ': {
        label: 'FAQs',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
            'CREATE': { label: 'Create', isPermitted: false },
            'UPDATE': { label: 'Update', isPermitted: false },
            'DELETE': { label: 'Delete', isPermitted: false },
        },
    },

    'LOGIN-AUDIT': {
        label: 'Login Audit',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
        },
    },

    'ACTIVITY-LOG': {
        label: 'Activity Log',
        privileges: {
            'VIEW': { label: 'View', isPermitted: false },
        },
    },

}