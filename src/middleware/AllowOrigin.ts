import { Request, Response, NextFunction } from 'express';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, formatDate } from '../utils';

// Others
import Config from '../config';

//--------------------------------------------------------------

export default (req: any, res: Response, next: NextFunction) => {
    const origin: any = req.ip;

    // new request log {
    if (!req.originalUrl.startsWith('/log/') && !req.originalUrl.startsWith('/storage/')) {
        logInfo(`[REQUEST:${formatDate(new Date(), 'YYYYMMDDHHmmssSSS')}] - ` + req.originalUrl);
    }
    // } new request log


    // check cors {
    if (!req.originalUrl.includes('/resource/')) {
        if (!empty(Config.CORS.ALLOW_ORIGIN) && !origin && !Config.CORS.ALLOW_ORIGIN.includes(origin)) {
            logError(`[CORS] - allow origin only: ${Config.CORS.ALLOW_ORIGIN.join(' | ')}`);
            return res.status(403).send('Forbidden - IP is not allowed');
        }

        /*res.header('Access-Control-Allow-Origin', origin);*/
    }
    // } check cors

    next();
}