// Models
import { User } from '../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getError, randomToken } from '../utils';
import Token from '../services/token';
import Encryption from '../services/encryption';

// Others
import Config from '../config';

// Interfaces
import { IHelperError } from '../services/token/interfaces';
import { ISetBasicToken, ISetBasicTokenRes } from './interfaces';
import { INTERNAL_MSG } from '../common/messages';

//--------------------------------------------------------------

export default class TokenHandler {

    static async setBasicToken({ id, allowRoute }: ISetBasicToken): Promise<ISetBasicTokenRes | IHelperError> {
        const ERROR_KEY = '[TOKEN-HANDLER-SET-BASIC-TOKEN] -';

        try {
            if (empty(id)) throw INTERNAL_MSG.COMMON.DATA.NOT_FOUND
            const basicToken = randomToken();

            // set transit token in user {
            const record: any = await User.findByIdAndUpdate(id, { basicToken }, { new: true }).lean();
            if (empty(record)) throw new Error(record?.error);
            // } set transit token in user

            // generate token {
            const tokenPayload = {
                id: id.toString(),
                basicToken,
                allowRoute: allowRoute || [],
            };
            const token: any = await Encryption.encrypt(tokenPayload, Config.APP.KEY);
            if (token?.error) throw new Error(token?.error);
            // } generate token

            return { token };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}