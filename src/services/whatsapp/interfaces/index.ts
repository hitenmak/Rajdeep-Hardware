interface IObj {
    [key: string]: any;
}

export interface IHelperError {
    error: string;
    errors?: IObj;
    errorKey?: string;
}

export interface ISendRet {
    msg: string;
}

export interface IWhatsappRet {
    error: string;
    data: any;
}