// Others
import Handler from './handler';
import FolderConfig from './config/FolderConfig';

//--------------------------------------------------------------

export default class OtherAttachment {

    static FOLDER = FolderConfig.OTHER_ATTACHMENT.FOLDER;
    static DEFAULT_MEDIA = FolderConfig.OTHER_ATTACHMENT.DEFAULT_MEDIA;

    static get(image: string | null, isLocalStorage?: boolean): any {
        return Handler.Uploader.mediaUrl(this.FOLDER, image, isLocalStorage, this.DEFAULT_MEDIA);
    }

    static async set(fieldName: any, req: any, res: any): Promise<any> {
        const resData: any = await Handler.Uploader.many(fieldName, this.FOLDER, req, res, ['csv']);
        return resData;
    }

    static async remove(keys: any): Promise<any> {
        return await Handler.Uploader.remove(keys, this.FOLDER);
    }

}