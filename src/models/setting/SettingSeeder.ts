// Models
import { Setting } from '.';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../utils';

// Others
import Config from '../../config';

//--------------------------------------------------------------

export default class SettingSeeder {

    constructor() {
        const ERROR_KEY = '[SETTING-SEEDER] -';

        Setting.create({
            "_id": "687649b7a2411ab91385f056",
            "contactDetails": {
                "email": "admin@yopmail.com",
                "phoneCode": "234",
                "phone": "9876543210",
                "website": `https://example.com/`,
                "location": {
                    "address1": "89 Opebi Rd",
                    "address2": "Ikeja",
                    "city": "Ikeja",
                    "state": "Lagos",
                    "country": "Nigeria",
                    "postcode": "100281",
                    "latitude": "6.592231",
                    "longitude": "3.358783"
                }
            },
            "appDetails": {
                "androidApp": {
                    "apkUrl": `https://play.google.com/store/apps/details?id=app.legallylogistics`,
                    "appLink": `https://play.google.com/store/apps/details?id=app.legallylogistics`,
                    "releaseNote": "Test Android",
                    "latestVersion": "3",
                    "isSkippable": false,
                    "versionList": [
                        { "version": "1" },
                        { "version": "2" },
                        { "version": "3" }
                    ]
                },
                "iosApp": {
                    "apkUrl": `https://apps.apple.com/us/app/legally-logistics/id6753582821`,
                    "appLink": `https://apps.apple.com/us/app/legally-logistics/id6753582821`,
                    "releaseNote": "Test IOS",
                    "latestVersion": "1.0.3",
                    "isSkippable": false,
                    "versionList": [
                        { "version": "1.0.1" },
                        { "version": "1.0.2" },
                        { "version": "1.0.3" }
                    ]
                }
            }
        }).catch((e: any) => logError(e, ERROR_KEY));

        logInfo(`${ERROR_KEY} seed successfully`);
    }
}
