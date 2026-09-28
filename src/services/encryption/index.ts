import crypto from 'crypto';

// Helpers
import { getError } from '../../utils';

// Interfaces
import { IHelperError } from './interfaces';

//--------------------------------------------------------------

export default class Encrypt {

    static ALGORITHM = 'aes-256-cbc';

    // helpers {
    static #createAES128Key(key: string) {
        const hash = crypto.createHash('sha256').update(key).digest('hex');
        return hash.substring(0, 32);
    }
    // helpers

    // Basic encryption method {
    static async encrypt(data: any, key: string): Promise<string | IHelperError> {
        const ERROR_KEY = 'ENCRYPT-ENCRYPT';
        try {
            const iv = crypto.randomBytes(16);
            const keyBuffer = this.#createAES128Key(key);
            const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);
            let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

    static async decrypt(encryptedData: string, key: string): Promise<any | IHelperError> {
        const ERROR_KEY = 'ENCRYPT-DECRYPT';
        try {
            const [ivHex, encryptedHex] = encryptedData.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const keyBuffer = this.#createAES128Key(key);
            const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
            let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8');
            decrypted += decipher.final('utf-8');
            return JSON.parse(decrypted);
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }
    // } Basic encryption method

}