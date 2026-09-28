import * as util from 'util';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../../utils';
import { fieldConfigs, formatFileName, formatFiles, getErrorMessage } from './Utils';
import * as s3 from './s3';
import * as disk from './disk';

// Others
import { ALLOW_FILE_TYPES, IS_LOCAL_STORAGE } from './Constant';

//--------------------------------------------------------------

export default class Uploader {

	// Url Methods { -----------------------------------------
	// get media base path
	static baseUrl(isFullUrl: boolean = true, isLocalStorage: boolean = false): string {
		return isLocalStorage ? disk.Manager.baseUrl(isFullUrl) : s3.Manager.baseUrl(isFullUrl);
	}

	// get media full and relative url
	static mediaUrl(folder: string, image: string | null, isLocalStorage: boolean = IS_LOCAL_STORAGE, defaultMediaName: string | null = '', isFullUrl: boolean = true): string {
		return isLocalStorage ? disk.Manager.mediaUrl(folder, image, defaultMediaName) : s3.Manager.mediaUrl(folder, image, defaultMediaName);
	}

	// get default image
	static defaultError(error: any, configs: any): string {
		if (error?.code === 'LIMIT_UNEXPECTED_FILE') return `${error?.field} selected more than ${configs[0]?.maxCount || 1}`;

		return getErrorMessage(error);
	}
	static defaultMedia(image: string | null, isFullUrl: boolean = true, isLocalStorage: boolean = IS_LOCAL_STORAGE): string {
		return isLocalStorage ? disk.Manager.defaultMedia(image, isFullUrl) : s3.Manager.defaultMedia(image, isFullUrl);
	}
	// } Url Methods -----------------------------------------


	// Upload Methods { -----------------------------------------
	static async many(
		fields: any,
		folderPath: string,
		req: any,
		res: any,
		allowFileTypes: string[] = ['image'], // Optional parameter
		isLocalStorage: boolean = IS_LOCAL_STORAGE,
		isDetails: boolean = false
	): Promise<any> {
		try {
			const configs = fieldConfigs(fields);

			// Resolve allowed file types dynamically
			const resolvedFileTypes = allowFileTypes;
			const uploadManager = isLocalStorage ? disk : s3;
			await util.promisify(
				uploadManager.Manager.upload(folderPath, resolvedFileTypes).fields(configs)
			)(req, res);

			return formatFiles(req.files, configs, isDetails);
		} catch (e: any) {
			logError(e)

			const configs = fieldConfigs(fields);
			return { error: this.defaultError(e, configs) };
		}
	}

	static async any(folderPath: string, req: any, res: any, allowFileTypes?: string[], isLocalStorage: boolean = IS_LOCAL_STORAGE, isDetails: boolean = false): Promise<any> {
		try {
			const resolvedFileTypes = allowFileTypes || Object.keys(ALLOW_FILE_TYPES.image);
			await util.promisify((isLocalStorage ? disk : s3).Manager.upload(folderPath, resolvedFileTypes).any())(req, res);
			return formatFileName(req);
		} catch (e: any) {
			logError(e)
			return { error: getErrorMessage(e) };
		}
	}
	// } Upload Methods -----------------------------------------


	// Remove Methods { -----------------------------------------
	static async remove(keys: any, folderPath: string, isLocalStorage: boolean = IS_LOCAL_STORAGE): Promise<number> {
		return await (isLocalStorage ? disk : s3).Manager.remove(keys, folderPath);
	}
	// } Remove Methods -----------------------------------------

}