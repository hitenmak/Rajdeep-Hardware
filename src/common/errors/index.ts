import { Response } from 'express';

// Helpers
import { logError } from '../../utils';

// Others
import { COMMON } from '../messages/internal';

//--------------------------------------------------------------

export const HTTP_STATUS = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
}

// An expected, client-facing failure. Anything else reaching sendApiError is treated as a 500.
// `data` lets a failure carry state the client needs to recover (e.g. the re-priced cart).
export class ApiError extends Error {
    constructor(public statusCode: number, message: string, public data: any = {}) {
        super(message);
        this.name = 'ApiError';
    }
}

export const sendApiError = (res: Response, e: any, errorKey?: string): void => {
    if (e instanceof ApiError) {
        res.status(e.statusCode).send({ status: false, message: e.message, data: e.data || {} });
        return;
    }

    logError(e, errorKey);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ status: false, message: COMMON.DATA.WRONG, data: {} });
}
