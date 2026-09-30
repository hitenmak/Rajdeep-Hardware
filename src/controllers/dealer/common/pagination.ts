// Helpers
import { getNum } from '../../../utils';

//--------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface IPageQuery {
    page: number;
    limit: number;
    skip: number;
}

// page/limit come from the client, so clamp them; an unbounded limit would let one call dump the catalogue
export const getPagination = (body: any = {}): IPageQuery => {
    const page = Math.max(1, Math.floor(getNum(body?.page, 1)) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(getNum(body?.limit, DEFAULT_LIMIT)) || DEFAULT_LIMIT));
    return { page, limit, skip: (page - 1) * limit };
}

export const paginationMeta = ({ page, limit }: IPageQuery, totalDocs: number): any => {
    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
    return { page, limit, totalDocs, totalPages, hasNextPage: page < totalPages };
}
