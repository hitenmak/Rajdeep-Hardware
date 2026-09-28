import moment from 'moment';

// Models
import { User } from '../../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getNum } from '../../../utils';
import { Format } from './helper';
import Core from '../../../core';

// Others
import { ADMIN_MSG } from '../../../common/messages';
import Paystack from '../../../services/paystack';

//--------------------------------------------------------------

export default class Main {

    static async details(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // get config {
            const withdrawalRequestAmountMaster = (await Core.Master.getWithdrawalRequestAmount()) || {};
            const withdrawalRequestAmountKeys = withdrawalRequestAmountMaster?.keys || [];
            const withdrawalRequestAmountData = withdrawalRequestAmountMaster?.data || [];
            // } get config

            // user earning {
            let earning = {
                holdAmount: authUser?.earning?.hold || 0,
                walletAmount: authUser?.earning?.wallet || 0,
                withdrawalRequestAmount: withdrawalRequestAmountData
            };
            // } user earning

            const data = Format.details({ earning });
            return res.status(200).send({ status: true, message: ADMIN_MSG.COMMON.DATA.FOUND, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async deposit(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                amount: 'required',
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // update earning {
            const updateUser: any = await User.findByIdAndUpdate(authUser?._id, { 'earning.wallet': getNum(authUser.earning.wallet) + getNum(body.amount) }, { new: true }).lean();
            if (empty(updateUser)) throw new Error(ADMIN_MSG.TRANSACTION_HISTORY.DEPOSIT.FAIL);
            // update earning {

            return res.status(200).send({ status: true, message: ADMIN_MSG.TRANSACTION_HISTORY.DEPOSIT.SUCCESS, data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async withdraw(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                amount: 'required',
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // check balance {
            if (getNum(authUser?.earning?.wallet || 0) < getNum(body.amount)) throw new Error(ADMIN_MSG.TRANSACTION_HISTORY.WITHDRAW.INSUFFICIENT_BALANCE);
            // } check balance

            let bankData = authUser?.bank || {};

            // check bank details {
            const bankDetailsVerifyRes: any = await Paystack.bankDetailsVerify(bankData);
            if (!empty(bankDetailsVerifyRes?.error?.message)) throw new Error(bankDetailsVerifyRes?.error?.message);
            // } check bank details


            // transfer recipient generate {
            const transferRecipientGenerateRes: any = await Paystack.transferRecipientGenerate(bankData);
            if (!empty(transferRecipientGenerateRes?.error?.message)) throw new Error(transferRecipientGenerateRes?.error?.message);
            // } transfer recipient generate


            // withdraw request {
            const withdrawRequestRes: any = await Paystack.withdrawRequest({
                amount: body?.amount,
                recipient: transferRecipientGenerateRes?.data?.recipient_code,
            });
            if (!empty(withdrawRequestRes?.error?.message)) throw new Error(withdrawRequestRes?.error?.message);
            // } withdraw request

            return res.status(200).send({ status: true, message: withdrawRequestRes?.message || ADMIN_MSG.TRANSACTION_HISTORY.WITHDRAW.REQUEST_SUCCESS, data: withdrawRequestRes?.data || {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async finalizeWithdraw(req: any, res: any): Promise<void> {
        const { rolePermission, authUser } = req;

        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                transferCode: 'required',
                otp: 'required',
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // finalize Transfer {
            const withdrawRequestRes: any = await Paystack.finalizeTransfer({
                transferCode: body?.transferCode,
                otp: body?.otp,
            });
            if (!empty(withdrawRequestRes?.error?.message)) throw new Error(withdrawRequestRes?.error?.message);
            // } finalize Transfer

            // deduct amount {
            await User.findByIdAndUpdate(authUser?._id, { 'earning.wallet': getNum(authUser.earning.wallet) - getNum(body.amount) }, { new: true }).lean();
            // } deduct amount

            return res.status(200).send({ status: true, message: withdrawRequestRes?.message || ADMIN_MSG.TRANSACTION_HISTORY.WITHDRAW.SUCCESS, data: withdrawRequestRes?.data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}