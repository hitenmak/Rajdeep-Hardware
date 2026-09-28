import axios from 'axios';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError, getStr, getBool } from '../../utils';

// Others
import Config from '../../config';

//--------------------------------------------------------------

export default class Paystack {

    // paystack API {
    static async bankList(): Promise<any> {
        try {
            // bank list {
            const response: any = await axios.get(`https://api.paystack.co/bank`, {
                headers: {
                    Authorization: `Bearer ${Config.PAY_STACK_SECRET_KEY}`,
                    'Cache-Control': 'no-cache',
                },
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false,
                }),
                timeout: 60000,
            });
            // } bank list

            let data: any = [];
            for (const bank of response?.data?.data) {
                data.push({
                    id: getStr(bank?.id),
                    name: getStr(bank?.name),
                    slug: getStr(bank?.slug),
                    code: getStr(bank?.code),
                    longcode: getStr(bank?.longcode),
                    gateway: getBool(bank?.gateway),
                    pay_with_bank: getBool(bank?.pay_with_bank),
                    supports_transfer: getBool(bank?.supports_transfer),
                    available_for_direct_debit: getBool(bank?.available_for_direct_debit),
                    active: getBool(bank?.active),
                    country: getStr(bank?.country),
                    currency: getStr(bank?.currency),
                    type: getStr(bank?.type),
                    is_deleted: getBool(bank?.is_deleted),
                    createdAt: bank?.createdAt,
                    updatedAt: bank?.updatedAt,
                });
            }

            return { status: response?.data?.status, message: response?.data?.message, data };
        } catch (error: any) {
            return { error: error?.response?.data || error.message, data: {} };
        }
    }

    static async bankDetailsVerify(payload: any): Promise<any> {
        try {
            // verify bank account {
            const response: any = await axios.get(`https://api.paystack.co/bank/resolve`, {
                params: {
                    account_number: payload?.accountNumber,
                    bank_code: payload.code,
                },
                headers: {
                    Authorization: `Bearer ${Config.PAY_STACK_SECRET_KEY}`,
                    'Cache-Control': 'no-cache',
                },
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false,
                }),
                timeout: 60000,
            });
            let data = response?.data;
            // } verify bank account

            return data;
        } catch (error: any) {
            return { error: error?.response?.data || error.message, data: {} };
        }
    }

    static async transferRecipientGenerate(payload: any): Promise<any> {
        try {
            // transfer recipient generate {
            const response: any = await axios.post(`https://api.paystack.co/transferrecipient`,
                {
                    type: payload?.type,
                    bank_code: payload?.code,
                    currency: payload?.currency,
                    name: payload?.accountName,
                    account_number: payload?.accountNumber
                },
                {
                    headers: {
                        Authorization: `Bearer ${Config.PAY_STACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    httpsAgent: new (require('https').Agent)({
                        rejectUnauthorized: false,
                    }),
                    timeout: 60000,
                }
            );
            let data = response?.data;
            // } transfer recipient generate

            return data;
        } catch (error: any) {
            return { error: error?.response?.data || error.message, data: {} };
        }
    }

    static async withdrawRequest(payload: any): Promise<any> {
        try {
            // withdraw request {
            const response: any = await axios.post(`https://api.paystack.co/transfer`,
                {
                    amount: payload?.amount,
                    recipient: payload?.recipient,
                    source: `balance`,
                    reason: `Withdrawal request`,
                    // reference: `acv_9ee55786-2323-4760-98e2-6380c9cb3f68`,
                },
                {
                    headers: {
                        Authorization: `Bearer ${Config.PAY_STACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    httpsAgent: new (require('https').Agent)({
                        rejectUnauthorized: false,
                    }),
                    timeout: 60000,
                }
            );
            let data = response?.data;
            // } withdraw request

            return data;
        } catch (error: any) {
            return { error: error?.response?.data || error.message, data: {} };
        }
    }

    static async finalizeTransfer(payload: any): Promise<any> {
        try {
            // finalize transfer {
            const response: any = await axios.post(`https://api.paystack.co/transfer/finalize_transfer`,
                {
                    transfer_code: payload?.transferCode,
                    otp: payload?.otp,
                },
                {
                    headers: {
                        Authorization: `Bearer ${Config.PAY_STACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    httpsAgent: new (require('https').Agent)({
                        rejectUnauthorized: false,
                    }),
                    timeout: 60000,
                }
            );
            let data = response?.data;
            // } finalize transfer

            return data;
        } catch (error: any) {
            return { error: error?.response?.data || error.message, data: {} };
        }
    }
    // } paystack API

}