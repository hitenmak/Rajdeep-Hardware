// Others
import Handler from './handler';
import FolderConfig from './config/FolderConfig';

//--------------------------------------------------------------

export default class Default {

    static FOLDER = FolderConfig.DEFAULT.FOLDER;
    static DEFAULT_MEDIA = FolderConfig.DEFAULT.DEFAULT_MEDIA;

    static get(image: string | null, isLocalStorage?: boolean): any {
        return Handler.Uploader.mediaUrl(this.FOLDER, image, isLocalStorage, this.DEFAULT_MEDIA);
    }

}