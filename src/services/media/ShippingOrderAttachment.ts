// Others
import FolderConfig from './config/FolderConfig';
import Handler from './handler';
import PdfHandler from './pdf-generate';
import { IS_LOCAL_STORAGE } from './handler/Constant';

//--------------------------------------------------------------

export default class ShippingOrderAttachment {

    static FOLDER = FolderConfig.SHIPPING_ORDER_ATTACHMENT.FOLDER;
    static DEFAULT_MEDIA = FolderConfig.SHIPPING_ORDER_ATTACHMENT.DEFAULT_MEDIA;

    static get(image: string | null, isLocalStorage?: boolean): any {
        return Handler.Uploader.mediaUrl(this.FOLDER, image, isLocalStorage, this.DEFAULT_MEDIA);
    }

    static async set(fieldName: any, req: any, res: any): Promise<any> {
        const resData: any = await Handler.Uploader.many(fieldName, this.FOLDER, req, res, ['attachment']);
        return resData;
    }

    static async remove(keys: any): Promise<any> {
        return await Handler.Uploader.remove(keys, this.FOLDER);
    }

    static async generatePdf({ content, template, fileName, pageSetup, isLocalStorage = IS_LOCAL_STORAGE }: any): Promise<any> {
        return await PdfHandler.Handler({ content, folderName: this.FOLDER, template, fileName, pageSetup, isLocalStorage });
    }

}