type TTrimmingParts = 'body' | 'params' | 'query';

const defaultTrimmingParts: TTrimmingParts[] = ['body', 'params', 'query'];

//--------------------------------------------------------------

const trimString = (input: any): any => {
    if (typeof input === 'string') return input.trim();

    if (input !== null && typeof input === 'object') {
        Object.keys(input).forEach((key) => {
            input[key] = trimString(input[key]);
        });
    }
    return input;
}

const trimmer = (fields: TTrimmingParts[] = defaultTrimmingParts): any => {
    return (req: any, res: any, next: any) => {
        fields.forEach((field: any) => {
            if (req[field]) req[field] = trimString(req[field]);
        });
        next();
    };
}
export default trimmer();
