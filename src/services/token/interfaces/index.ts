export interface IHelperError {
    error: string;
    errorKey?: string;
}
export interface IVerifyRet {
    id: string;
    [key: string]: any;
}

export interface IOtpRet {
    otp: number;
    expireAt: Date;
    expireInSecond: number
}
export interface IOtpVerifyRet {
    status: boolean;
}

export interface IEncryptPassword {
    hash: string;
    salt: string;
}
