import jsonwebtoken, { SignOptions, VerifyOptions } from 'jsonwebtoken';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError } from '../../utils';

// Others
import Config from '../../config';

// Interfaces
import { IHelperError, IVerifyRet } from './interfaces';

//--------------------------------------------------------------

export default class Jwt {

    static sign(identity: any, options: SignOptions = {}): string {
        return jsonwebtoken.sign(identity, Config.JWT.SECRET_KEY, { expiresIn: Config.JWT.EXPIRES_IN, ...options } as any);
    }

    static verify(token: string, secretKey: string, options: VerifyOptions = {}): Promise<IHelperError | IVerifyRet> {
        const ERROR_KEY = 'JWT-VERIFY';
        token = token.replace('Bearer ', '');

        return new Promise((resolve) => {
            jsonwebtoken.verify(token, secretKey, options, (err: any, decoded: any) => {
                resolve(err ? { error: getError(err), errorKey: ERROR_KEY } : decoded);
            });
        });
    }

}
