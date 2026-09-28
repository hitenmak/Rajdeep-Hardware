import { Response, NextFunction } from 'express';

// Helpers
import { empty } from '../utils';

//--------------------------------------------------------------

export default (req: any, res: Response, next: NextFunction) => {
    if (!empty(req.session?.panelUserId)) return res.redirect('/panel/dashboard');
    next();
}
