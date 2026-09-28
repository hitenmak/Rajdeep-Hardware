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
