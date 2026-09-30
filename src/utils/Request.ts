// Helpers
import { empty } from './Values';

//--------------------------------------------------------------

// x-forwarded-for is client-controlled; use for audit metadata only, never for access decisions
export const getClientIp = (req: any): string => {
    return (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '';
}

export const getClientAgent = (req: any): string => {
    const ua = req.useragent;
    if (empty(ua)) return req.headers['user-agent'] || '';
    return `${ua.browser || ''} ${ua.version || ''} on ${ua.os || ''}`.trim();
}
