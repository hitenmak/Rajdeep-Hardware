// Models
import { RolePermission } from '.';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../utils';

// Others
import Config from '../../config';

//--------------------------------------------------------------

export default class RolePermissionSeeder {

    constructor() {
        const ERROR_KEY = '[ROLE-PERMISSION-SEEDER] -';

        RolePermission.insertMany([
            {
                "_id": "67f63dcf1414314a3e071a5d",
                "name": "Super Admin",
                "department": "ADMIN",
                "permission": {
                    "isMaster": true,
                    "modules": {}
                }
            },
            {
                "name": "Account Manager",
                "department": "ACCOUNT_MANAGER",
                "permission": {
                    "isMaster": false,
                    "modules": {
                        "DASHBOARD": { "VIEW": true },
                        "CATEGORY": { "VIEW": true },
                        "PRODUCT": { "VIEW": true, "EXPORT": true },
                        "PRODUCT-IMAGE": { "VIEW": true },
                        "INVENTORY": { "VIEW": true },
                        "PRICING": { "VIEW": true },
                        "DEALER": { "VIEW": true, "EXPORT": true },
                        "PURCHASE-ORDER": { "VIEW": true, "CREATE": true, "UPDATE": true, "DELETE": true, "CHANGE-STATUS": true, "EXPORT": true },
                        "ASSIGN-PACKAGE-MANAGER": { "ASSIGN": true },
                        "ASSIGN-DELIVERY-MANAGER": { "ASSIGN": true },
                        "DELIVERY-PICTURE": { "VIEW": true },
                        "REPORT": { "VIEW": true, "EXPORT": true },
                    }
                }
            },
            {
                "name": "Package Manager",
                "department": "PACKAGE_MANAGER",
                "permission": {
                    "isMaster": false,
                    "modules": {
                        "DASHBOARD": { "VIEW": true },
                        "CATEGORY": { "VIEW": true },
                        "PRODUCT": { "VIEW": true },
                        "PRODUCT-IMAGE": { "VIEW": true },
                        "INVENTORY": { "VIEW": true },
                        "PRICING": { "VIEW": true },
                        "DEALER": { "VIEW": true },
                        "PURCHASE-ORDER": { "VIEW": true, "UPDATE": true, "CHANGE-STATUS": true, "EXPORT": true },
                        "ASSIGN-DELIVERY-MANAGER": { "ASSIGN": true },
                        "DELIVERY-PICTURE": { "VIEW": true },
                        "REPORT": { "VIEW": true },
                    }
                }
            },
            {
                "name": "Delivery Manager",
                "department": "DELIVERY_MANAGER",
                "permission": {
                    "isMaster": false,
                    "modules": {
                        "DASHBOARD": { "VIEW": true },
                        "PURCHASE-ORDER": { "VIEW": true, "CHANGE-STATUS": true, "EXPORT": true },
                        "DELIVERY-PICTURE": { "VIEW": true, "UPLOAD": true },
                        "REPORT": { "VIEW": true },
                    }
                }
            },
        ]).catch((e: any) => logError(e, ERROR_KEY));

        logInfo(`${ERROR_KEY} seed successfully`);
    }
}