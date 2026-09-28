import * as speakeasy from 'speakeasy';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../../utils';

// Others
import Config from '../../config';

//--------------------------------------------------------------

export default class Mfa {

    static generateSecrete(name?: string): any {
        const secrete = speakeasy.generateSecret({ name: name || Config.APP.NAME });

        return {
            ascii: secrete?.ascii,
            hex: secrete?.hex,
            base32: secrete?.base32,
            OTPAuthURL: secrete?.otpauth_url,
        }
    }

    static verifySecrete(token: string, secret: any): boolean {
        if (empty(token) || empty(secret) || empty(secret.ascii)) return false;

        try {
            return speakeasy.totp.verify({
                secret: secret.ascii,
                encoding: 'ascii',
                token,
            });
        } catch (e: any) {
            return false;
        }
    }

}