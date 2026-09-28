import { Response, NextFunction } from 'express';

//--------------------------------------------------------------
/*
    Lightweight session based flash messaging for the server rendered admin panel
    (no connect-flash dependency). Controllers call req.setFlash(type, message) right
    before a redirect; the next request's view picks it up via res.locals.flash and it
    is cleared immediately so it only ever shows once.
*/

export default (req: any, res: Response, next: NextFunction) => {
    res.locals.flash = req.session?.flash || null;
    if (req.session) req.session.flash = null;

    req.setFlash = (type: 'success' | 'error' | 'info' | 'warning', message: string): void => {
        if (req.session) req.session.flash = { type, message };
    };

    next();
}
