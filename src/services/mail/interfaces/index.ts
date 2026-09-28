interface IObj {
    [key: string]: any;
}

export interface IHelperError {
    error: string;
    errors?: IObj;
    errorKey?: string;
}

export interface ISend {
    toEmail: string;
    [key: string]: any;
}

export interface ISendRet {
    msg: string;
}

export interface IMailerRet {
    msg: string;
}
