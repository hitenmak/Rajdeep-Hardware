export interface IEmailOtpSendRet {
    status: boolean;
    otp: number;
    expireAt: Date;
    expireInSecond: number;
}

export interface IEmailOtpVerify {
    status: boolean;
}

export interface ISetBasicToken {
    id: string;
    allowRoute: any;
}

export interface ISetBasicTokenRes {
    token: string;
}

export interface IDealerTokenPair {
    tokenType: 'Bearer';
    accessToken: string;
    accessTokenExpiresIn: number; // seconds
    refreshToken: string;
    refreshTokenExpiresAt: Date;
}

export interface IDealerSessionMeta {
    rememberMe?: boolean;
    fcmToken?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export interface IDealerAccessPayload {
    dealerId: string;
    sessionId: string;
}

export interface IDealerPurposePayload {
    dealerId: string;
    [key: string]: any;
}
