import { PutObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from 'puppeteer';
import { ulid } from 'ulid';
import path from 'path';
import ejs from 'ejs';
import fs from 'fs';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, getError } from '../../../../utils';

//Others
import Config from '../../../../config';
import s3 from '../../../../services/media/handler/s3/Config';
import { IS_LOCAL_STORAGE, TEMP_FOLDER_NAME, LOCAL_STORAGE_FOLDER } from '../../handler/Constant';

// Interfaces
import { IHelperError, IPDFGenerate, IPDFGenerateRet } from '../interfaces';

const PdfConfig = {
    IS_LOCAL_STORAGE,
    TEMP_FOLDER_NAME,
    LOCAL_STORAGE_FOLDER,

    VIEW_FOLDER_NAME: 'views',
    VIEW_BASE_FOLDER_NAME: 'pdf',

    DEFAULT_PAGE_SETUP: {
        // format: 'A4',
        width: '100mm', // 50mm
        height: '150mm', // 40mm
        printBackground: true,
        margin: {
            top: '6px',
            bottom: '6px',
            left: '6px',
            right: '6px',
        }
    },

};

//--------------------------------------------------------------

export default async ({ content, folderName, template, fileName, pageSetup, isLocalStorage = PdfConfig.IS_LOCAL_STORAGE }: IPDFGenerate): Promise<IPDFGenerateRet | IHelperError> => {
    const ERROR_KEY = '[PDF-HANDLER-GENERATE] -';

    let browser = null;

    try {
        // prepare html {
        const viewPath = path.resolve(Config.APP.ROOT_DIR, PdfConfig.VIEW_FOLDER_NAME, PdfConfig.VIEW_BASE_FOLDER_NAME, `${template}.ejs`);
        const htmlContent: any = await ejs.renderFile(viewPath, { ...content });
        // } prepare html

        // d(path.join(ROOT_DIR_PATH, 'storage', 'pdf-preview.html'))
        // fs.writeFile(path.join(ROOT_DIR_PATH, 'storage', 'pdf-preview.html'), htmlContent, 'utf8', (err) => {
        //     if(err) {
        //         logError('Error writing file:', err);
        //         return;
        //     }
        //     d('HTML file created successfully!');
        // });

        // sync file {
        fileName = fileName ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`) : `${ulid()}.pdf`;
        const outputDir = path.resolve(Config.APP.BASE_ROOT_DIR, PdfConfig.LOCAL_STORAGE_FOLDER, isLocalStorage ? '' : PdfConfig.TEMP_FOLDER_NAME, folderName);
        const filePath = path.join(outputDir, fileName);

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        // } sync file

        // Only uncomment when need to see preview {
        /* fs.writeFile(path.join(outputDir, 'preview.html'), htmlContent, (err) => {
            if (err) {
                logError('Error writing HTML to file:', err);
            } else {
                d(`HTML content successfully written to ${outputDir}`);
            }
        }); */
        // } Only uncomment when need to see preview

        // launch browser {
        browser = await puppeteer.launch({
            // headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
                // '--no-sandbox', '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        // } launch browser

        const pdfBuffer = await page.pdf({
            ...PdfConfig.DEFAULT_PAGE_SETUP,
            ...pageSetup,
            path: filePath,
        });
        if (!pdfBuffer) throw `PDF generation failed`;

        // upload to s3 {
        if (!isLocalStorage) {
            const fileBuffer = fs.readFileSync(filePath);
            if (!fileBuffer) throw `PDF generation failed not read pdf`;
            await s3.send(new PutObjectCommand({
                Bucket: Config.AWS_S3_BUCKET.BUCKET_NAME,
                // ACL: 'public-read',
                Key: `${folderName}/${fileName}`,
                Body: fileBuffer,
                ContentType: `application/pdf`,
            }));
        }
        // } upload to s3

        return { name: fileName };
    } catch (e: any) {
        logError(ERROR_KEY, e);
        return { error: getError(e), errorKey: ERROR_KEY };
    } finally {
        if (browser) await browser.close();
    }
}