import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IDealerSession extends Document {
    dealerId: Schema.Types.ObjectId;

    refreshTokenHash: string; // sha256 of the refresh-token secret; rotated on every refresh
    expiresAt: Date;
    rememberMe: boolean; // decides the refresh window kept on rotation
    lastUsedAt: Date | null;

    revokedAt: Date | null;
    revokedReason: string | null; // LOGOUT, LOGOUT_ALL, PASSWORD_CHANGED, PASSWORD_RESET, REFRESH_TOKEN_REUSE

    fcmToken: string | null;
    ipAddress: string | null;
    userAgent: string | null;
}
