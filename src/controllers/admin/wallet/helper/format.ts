// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getStr } from '../../../../utils';
import MediaManager from '../../../../services/media';

// Interfaces
import { IObj } from '../../../../common/interfaces';

//--------------------------------------------------------------

export const details = (rawData: IObj, extra: IObj = {}): IObj => {
    const data = {
        holdAmount: getStr(rawData?.earning?.holdAmount),
        walletAmount: getStr(rawData?.earning?.walletAmount),
        withdrawalRequestAmount: rawData?.earning?.withdrawalRequestAmount || [],
    };
    return data;
}

export const transactionHistory = (rawData: IObj[], extra: IObj = {}): IObj => {
    const history = [];

    for (const r of rawData || []) {
        const userData: any = {
            id: getStr(r?._id),

            user: {
                id: getStr(r?.userId?._id),
                firstName: getStr(r?.userId?.firstName),
                lastName: getStr(r?.userId?.lastName),
                email: getStr(r?.userId?.email),
            },
            wallet: getStr(r?.wallet),

            message: getStr(r?.message),
            status: extra?.transactionHistoryStatusData?.[r?.status] || {},
            createdAt: r?.createdAt || '',
        };

        history.push(userData);
    }

    const data = {
        history
    };
    return data;
}
