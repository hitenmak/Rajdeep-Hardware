
//--------------------------------------------------------------

const logStyle: any = {
    Reset: '\x1b[0m',

    FgCyan: '\x1b[36m',
    FgYellow: '\x1b[33m',
    FgRed: '\x1b[31m',
    FgGreen: '\x1b[32m',
};

export const getError = (e: any, label?: string, isObject: boolean = false): string => {
    if (!e) return '';

    let errorMsg = `An error occurred: Unknown Error :(`;

    if (typeof e === 'string') {
        errorMsg = e;

    } else if (e.codeName && typeof e.codeName === 'string') {
        errorMsg = `${e.code ? e.code + ': ' : ''}${e.codeName}`;

    } else if (typeof e.message === 'string') {
        errorMsg = `${e.code ? e.code + ': ' : ''}${e.message}`;

    } else if (typeof e.error === 'string') {
        errorMsg = e.error;
        // errorMsg = `${e.errorKey ? e.errorKey + ': ' : ''}${e.error}`;
    } else if (typeof e === 'object') {
        if (isObject) errorMsg = e.errors;
        else errorMsg = e.error;
    }

    if (label && typeof errorMsg === 'string') errorMsg = `${label.trim()} ${errorMsg}`;
    return errorMsg;
}

export const log = (data: any, flag?: any): void => {
    if (flag) console.log(logStyle.FgCyan, `----- ${flag} -----`, logStyle.Reset);
    console.log(logStyle.FgCyan, data, logStyle.Reset);
}

export const logInfo = (data: any, flag?: any): void => {
    if (flag) console.log(logStyle.FgCyan, `----- ${flag} -----`, logStyle.Reset);
    console.log(logStyle.FgCyan, data, logStyle.Reset);
}

export const logWarn = (data: any, flag?: any): void => {
    if (flag) console.log(logStyle.FgCyan, `----- ${flag} -----`, logStyle.Reset);
    console.log(logStyle.FgYellow, data, logStyle.Reset);
}

export const logError = (data: any, flag?: any): void => {
    if (flag) console.log(logStyle.FgCyan, `----- ${flag} -----`, logStyle.Reset);
    console.log(logStyle.FgRed, data, logStyle.Reset);
}

export const logSuccess = (data: any, flag?: any): void => {
    if (flag) console.log(logStyle.FgCyan, `----- ${flag} -----`, logStyle.Reset);
    console.log(logStyle.FgGreen, data, logStyle.Reset);
}
