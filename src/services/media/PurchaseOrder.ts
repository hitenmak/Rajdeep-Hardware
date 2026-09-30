import fs from 'fs';
import path from 'path';

// Others
import Config from '../../config';
import FolderConfig from './config/FolderConfig';
import Handler from './handler';
import PdfHandler from './pdf-generate';
import { IS_LOCAL_STORAGE, LOCAL_STORAGE_FOLDER } from './handler/Constant';

//--------------------------------------------------------------

export default class PurchaseOrder {

    static FOLDER = FolderConfig.PURCHASE_ORDER.FOLDER;
    static DEFAULT_MEDIA = FolderConfig.PURCHASE_ORDER.DEFAULT_MEDIA;

    static get(fileName: string | null, isLocalStorage?: boolean): any {
        return Handler.Uploader.mediaUrl(this.FOLDER, fileName, isLocalStorage, this.DEFAULT_MEDIA);
    }

    // local disk can be wiped (redeploys, cleanup) while the PO still references the file; S3 objects are trusted
    static exists(fileName: string | null, isLocalStorage: boolean = IS_LOCAL_STORAGE): boolean {
        if (!fileName) return false;
        if (!isLocalStorage) return true;
        return fs.existsSync(path.resolve(Config.APP.BASE_ROOT_DIR, LOCAL_STORAGE_FOLDER, this.FOLDER, path.basename(fileName)));
    }

    static async generatePdf({ content, template, fileName, pageSetup, isLocalStorage = IS_LOCAL_STORAGE }: any): Promise<any> {
        return await PdfHandler.Handler({ content, folderName: this.FOLDER, template, fileName, pageSetup, isLocalStorage });
    }

}
