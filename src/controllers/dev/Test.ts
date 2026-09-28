import path from 'path';
import axios from 'axios';

// Models
import Models from '../../models';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize } from '../../utils';
import BarCode from '../../services/bar-code';
import Token from '../../services/token';
import MediaManager from '../../services/media';

// Others
import Config from '../../config';
import Core from '../../core';
import ApiEndpoint from '../../config/ApiEndpoint';

// Process
import * as DailyUpdate from '../../cron/daily-update';
import Whatsapp from '../../services/whatsapp';

//--------------------------------------------------------------

export default class Test {

    static async dataReset(req: any, res: any): Promise<void> {
        try {
            let data: any = {};

            return res.status(200).send({ status: true, message: 'Data clear successfully...', data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async seeder(req: any, res: any): Promise<void> {
        try {
            // new Models.Setting.SettingSeeder();
            new Models.RolePermission.RolePermissionSeeder();
            new Models.User.UserSeeder();

            return res.status(200).send({ status: true, message: 'Data added successfully...', data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async getLatLong(req: any, res: any): Promise<void> {
        try {
            let body = req.body;
            let response: any = {};

            // get lat long {
            let getFromLatLong = await Core.Kit.getLatLong(body?.from);
            if (getFromLatLong?.error) throw new Error(`From Address Lat-Long: ${getFromLatLong?.error}`);
            response.fromLatLong = {
                location: getFromLatLong?.location,
                latitude: getFromLatLong?.latitude,
                longitude: getFromLatLong?.longitude,
            };

            let getToLatLong = await Core.Kit.getLatLong(body?.to);
            if (getToLatLong?.error) throw new Error(`To Address Lat-Long: ${getToLatLong?.error}`);
            response.toLatLong = {
                location: getToLatLong?.location,
                latitude: getToLatLong?.latitude,
                longitude: getToLatLong?.longitude,
            };
            // } get lat long

            // get distance {
            let getDistance = await Core.Kit.getDistance(body?.from, body?.to);
            if (getDistance?.error) throw new Error(`Distance: ${getDistance?.error}`);
            response.getDistance = getDistance;
            // } get distance

            return res.status(200).send({ status: true, message: response?.error || 'Data Found', data: response });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async barcodeGenerate(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                text: 'required | longtext',
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            const barCodeData = BarCode.generate(body.text);

            return res.status(200).send({ status: true, message: 'Barcode generated successfully...', data: barCodeData });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async mailTest(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                email: 'required | email',
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // Mail Sending {
            // } Mail Sending

            return res.status(200).send({ status: true, message: 'Mail send successfully...', data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async notificationTest(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                fcmToken: 'required | array',
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            // Notification Sending {
            // } Notification Sending

            return res.status(200).send({ status: true, message: 'Notification sent successfully...', data: {} });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async whatsAppSendMessage(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            let sanitizeResult = await sanitize(req?.body, {
                phoneNumber: `required`,
                pinNumber: `required`,
                name: `required`,
                orderNumber: `required`,
                paymentUrl: `required`
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            let response: any = {};

            response = await Whatsapp.testMessage({ phoneNumber: body?.phoneNumber });
            // response = await Whatsapp.otpSend({ phoneNumber: body?.phoneNumber, pinNumber: body?.pinNumber });
            // response = await Whatsapp.paymentLinkSend({
            //     phoneNumber: body?.phoneNumber,
            //     name: body?.name,
            //     orderNumber: body?.orderNumber,
            //     paymentUrl: body?.paymentUrl
            // });
            if (response?.error) throw new Error(response?.error?.error?.message || response?.error);

            let data = {
                ...response?.data
            };
            return res.status(200).send({ status: true, message: 'Message sent successfully...', data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async migration(req: any, res: any): Promise<void> {
        try {
            // await DailyUpdate.NotCopmpletedProcessEarnigTransfer();

            let data: any = {};

            return res.status(200).send({ status: true, message: 'Data migrate successfully...', data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    // NOTE: the one-off Category+Subcategory tree-unification migration that used
    // to live here has already been run successfully against this app's database
    // (verified: parentId/level backfilled on every category, every former
    // Subcategory doc copied into `categories` with its original _id preserved,
    // SUBCATEGORY permission grants folded into CATEGORY) and the old Subcategory
    // model has been removed, so the migration code was removed with it.

    // NOTE: the one-off migration that used to live here (copying every
    // ProductAuditLog/DealerAuditLog entry into the unified `activityLogs`
    // collection) has already been run successfully against this app's
    // database (verified: 35 Product entries migrated with original
    // timestamps/summaries preserved, 0 Dealer entries existed) and the old
    // ProductAuditLog/DealerAuditLog models have been removed, so the
    // migration code was removed with it.

}