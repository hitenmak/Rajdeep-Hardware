import crypto from 'crypto'

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../../utils';

// Interfaces
import { IEncryptPassword } from './interfaces';

//--------------------------------------------------------------

export default class Password {

    static #generateSalt(): string {
        return crypto.randomBytes(Math.ceil(10)).toString('hex').slice(0.16);
    }

    static #sha512(password: string, salt: string): string {
        let hash = crypto.createHmac('sha512', salt);
        hash.update(password);
        return hash.digest('hex');
    }

    static encryptPassword = (value: string): IEncryptPassword => {
        const salt = this.#generateSalt();
        const hash = this.#sha512(value, salt);
        return { hash, salt };
    }

    static verifyPassword = (value: string, hash: string, salt: string): boolean => {
        return this.#sha512(value, salt) === hash;
    }

}