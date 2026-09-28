interface IObj {
    [key: string]: any;
}

export interface IHelperError {
    error: string;
    errors?: IObj;
    errorKey?: string;
}

export interface ISend {
    [key: string]: any;
}

export interface ISendRet {
    msg: string;
}
