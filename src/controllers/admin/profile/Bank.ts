import moment from 'moment';

// Models
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, flipOnKey } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';

// Others
import { ADMIN_MSG } from '../../../common/messages';
import Paystack from '../../../services/paystack';

//--------------------------------------------------------------

export default class Bank {

    static async details(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            const data = Format.bankDetails(authUser);
            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async update(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                bank: `required | object`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            let body = sanitizeResult.body;

            sanitizeResult = await sanitize(req?.body?.bank, {
                branchName: `required`,
                accountNumber: `required`,
                accountName: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            body.bank = sanitizeResult.body;
            // sanitize data {

            // check exist bank name {
            const bankList: any = await Paystack.bankList();
            if (!empty(bankList?.error?.message)) throw new Error(bankList?.error?.message);

            let bankListData: any = flipOnKey(bankList?.data, 'name');
            let bankData = bankListData?.[body?.bank?.branchName] || {};
            if (empty(bankData)) throw new Error(ADMIN_MSG.BANK.BANK_NOT_FOUND);
            // } check exist bank name

            // bank data {
            let bank = {
                slug: bankData?.slug,
                code: bankData?.code,
                country: bankData?.country,
                currency: bankData?.currency,
                type: bankData?.type,
                name: bankData?.name,
                accountName: body?.bank?.accountName,
                accountNumber: body?.bank?.accountNumber,
            };
            // } bank data

            // update bank details {
            const record = await User.findByIdAndUpdate(authUser?._id, { bank }, { new: true }).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.BANK.FAIL);
            // } update bank details

            const data = Format.bankDetails(record);
            return res.status(200).send({ status: true, message: ADMIN_MSG.BANK.SUCCESS, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}