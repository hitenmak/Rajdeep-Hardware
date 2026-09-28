import jsonwebtoken from 'jsonwebtoken';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError } from '../../utils';

// Others
import Config from '../../config';

// Interfaces
import { IHelperError, IVerifyRet } from './interfaces';

//--------------------------------------------------------------

export default class Jwt {

    static sign(identity: any): string {
        return jsonwebtoken.sign(identity, Config.JWT.SECRET_KEY, { expiresIn: Config.JWT.EXPIRES_IN } as any);
    }

    static verify(token: string, secretKey: string): Promise<IHelperError | IVerifyRet> {
        const ERROR_KEY = 'JWT-VERIFY';
        token = token.replace('Bearer ', '');

        return new Promise((resolve) => {
            jsonwebtoken.verify(token, secretKey, (err: any, decoded: any) => {
                resolve(err ? { error: getError(err), errorKey: ERROR_KEY } : decoded);
            });
        });
    }

}