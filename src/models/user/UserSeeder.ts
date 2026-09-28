// Models
import { User } from '.';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../utils';
import Token from '../../services/token';

// Others
import Config from '../../config';

//--------------------------------------------------------------

export default class UserSeeder {

    constructor() {
        const ERROR_KEY = '[USER-SEEDER] -';

        const password = Token.Password.encryptPassword(Config.APP.MASTER_PASSWORD);

        User.insertMany([
            {
                "_id": "687649b7a2411ab91385f059",
                "rolePermissionId": "67f63dcf1414314a3e071a5d",
                "firstName": "Super",
                "lastName": "Admin",
                "email": "admin@yopmail.com",
                "isEmailVerified": false,
                "password": password,
                "isTermsAndConditions": true,
                "status": "APPROVED",
            }
        ]).catch((e: any) => logError(e, ERROR_KEY));

        logInfo(`${ERROR_KEY} seed successfully`);
    }
}