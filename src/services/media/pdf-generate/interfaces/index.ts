export interface IPDFGenerate {
    content: any;
    folderName: string;
    template: string;
    pageSetup?: any;
    fileName?: string;
    isLocalStorage?: boolean;
    companyName?: string;
}

export interface IPDFGenerateRet {
    name: string;
}

export interface IHelperError {
    error: string;
    errorKey?: string;
}
