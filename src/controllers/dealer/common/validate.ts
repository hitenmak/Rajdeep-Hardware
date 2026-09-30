// Helpers
import { sanitize } from '../../../utils';

// Others
import { ApiError, HTTP_STATUS } from '../../../common/errors';

//--------------------------------------------------------------

export const validate = async (rawData: any, rules: any): Promise<any> => {
    const result = await sanitize(rawData || {}, rules);
    if (result?.error || !result?.body) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, result?.error);
    return result.body;
}
