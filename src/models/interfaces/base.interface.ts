export interface IOptions {
    relations?: string[], // relations
    order?: { [key: string]: 'ASC' | 'DESC' }; // order by
    take?: number; // limit of record
    skip?: number; // number of page
}

export interface IQuery {
    [key: string]: any;
}

export interface IData {
    [key: string]: any;
}
