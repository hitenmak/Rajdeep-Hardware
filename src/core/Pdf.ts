import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
const ejs = require('ejs');

// Models
import { Setting } from '../models/setting';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError, getNum, getStr, formatDate } from '../utils';
import MediaManager from '../services/media';
import FolderConfig from '../services/media/config/FolderConfig';
import Core from '../core';


// Interfaces
import Config from '../config';
import { IHelperError } from '../services/token/interfaces';
import { ROOT_DIR } from '../config/Constant';

//--------------------------------------------------------------

export default class Pdf {

    static async orderPackageSlip(data: any, extra: any = {}): Promise<{ status: boolean; fileName: any; } | IHelperError> {
        const ERROR_KEY = '[SLIP-PDF-GENERATE]';

        try {
            // get setting {
            const settingData: any = Setting.findOne().lean();
            // } get setting

            // contact details {
            let contactDetails = settingData?.contactDetails || {};
            // } contact details

            // data {
            data.parcel = extra?.parcel;
            data.parcel.etaDate = formatDate(data.parcel.etaDate, 'YYYY-MM-DD');
            data.parcel.createdAt = formatDate(new Date(), 'YYYY-MM-DD');
            // } data

            // extra details {
            extra = {
                appName: Config.APP.NAME,
                sendParcelUrl: Config.WEB_APP.SEND_PARCLE_URL,
                icons: {
                    logo: getStr(MediaManager.Email.get('logo-black.png')),
                    footerLogo: getStr(MediaManager.Email.get('logo-black.png')),
                    fragileIcon: getStr(MediaManager.Default.get('fragile-icon.png')),
                    insuranceIcon: getStr(MediaManager.Default.get('insurance-icon.png')),
                },
                contactDetails,
            };
            // } extra details

            // store PDF {
            let fileNameBigSize = `package-slip-big-${data.parcel?.trackingID}.pdf`;
            let generatePdfBigSize = await MediaManager.ShippingOrderAttachment.generatePdf({
                content: { data, extra },
                template: 'slip-normal',
                fileName: fileNameBigSize,
                pageSetup: { width: '100mm', height: '150mm' }
            });
            if (generatePdfBigSize.error) throw generatePdfBigSize.error;

            let fileNameSmallSize = `package-slip-small-${data.parcel?.trackingID}.pdf`;
            let generatePdfSmallSize = await MediaManager.ShippingOrderAttachment.generatePdf({
                content: { data, extra },
                template: 'slip-small',
                fileName: fileNameSmallSize,
                pageSetup: { width: '50mm', height: '40mm' }
            });
            if (generatePdfSmallSize.error) throw generatePdfSmallSize.error;
            // } store PDF

            /*// local store PDF {
            // render html {
            let pdfTemplate = 'slip-normal';
            let html = await ejs.renderFile(`${ROOT_DIR}/views/pdf/${pdfTemplate}.ejs`, { data, extra });
            // } render html

            // get directory path {
            const outputDir = path.resolve(ROOT_DIR, `../${Config.STORAGE.LOCAL_FOLDER}/${FolderConfig.SHIPPING_ORDER_ATTACHMENT.FOLDER}`);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const outputPath = path.join(outputDir, fileName);
            // } get directory path

            const browser = await puppeteer.launch({
                headless: true,
                executablePath: Config.APP.MODE === 'dev' ? `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe` : `/usr/bin/google-chrome`,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.pdf({
                path: outputPath,
                // format: 'A4',
                width: '90mm',
                height: '130mm', // 180mm
                printBackground: true,
                margin: {
                    top: '10px',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                }
            });
            await browser.close();*/
            // } local store PDF

            return { status: true, fileName: { fileNameBigSize, fileNameSmallSize } };
        } catch (e: any) {
            return { error: getError(e), errorKey: ERROR_KEY };
        }
    }

}