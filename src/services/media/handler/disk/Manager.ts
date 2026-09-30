import * as path from 'path';
import multer from 'multer';
import fs from 'fs';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../../../../utils';
import { fileFilter } from '../Utils';

// Others
import Config from '../../../../config';
import { MAX_FILE_SIZE_MB, DEFAULT_FOLDER, LOCAL_STORAGE_FOLDER } from '../Constant';

//--------------------------------------------------------------

export default class Manager {

	static baseUrl(isFullUrl: boolean = true): string {
		return `${isFullUrl ? Config.APP.URL : ''}/${LOCAL_STORAGE_FOLDER}/`;
	}

	static defaultMedia(image: string | null, isFullUrl: boolean = true): string {
		return image ? `${this.baseUrl(isFullUrl)}${DEFAULT_FOLDER}/${image}` : '';
	}

	static mediaUrl(folder: string, image: string | null, defaultMediaName: string | null = '', isFullUrl: boolean = true): string {
		return image ? `${this.baseUrl(isFullUrl)}${folder ? folder + '/' : ''}${image}` : this.defaultMedia(defaultMediaName);
	}

	static upload(folderPath: string, allowFileTypes: string[] = ['image']) {
		return multer({
			storage: multer.diskStorage({
				destination: (req: any, file: any, cb: any) => {
					cb(null, `${Config.STORAGE.LOCAL_FOLDER}/${folderPath}`);
				},
				filename: (req: any, file: any, cb: any) => {
					const fileName = `${Date.now()}X${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
					cb(null, fileName);
				},

				// key: (req: any, file: any, cb: any) => {
				// 	const fileName = `${folderPath ? folderPath + '/' : ''}${Date.now()}X${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
				// 	cb(null, `${fileName}`);
				// },
			}),
			fileFilter: fileFilter(allowFileTypes),
			limits: {
				fileSize: MAX_FILE_SIZE_MB * 1048576,
			},
		});
	}

	static async remove(keyData: null | string | string[], folderPath: string = ''): Promise<number> {
		if (empty(keyData)) return 0;

		if (typeof keyData === 'string') keyData = [keyData];

		const baseFolderPath = `${Config.STORAGE.LOCAL_FOLDER}/${folderPath ? folderPath + '/' : ''}`;

		// awaited so callers really are done when this resolves; a failed unlink (e.g. EBUSY on
		// Windows) is logged instead of escaping from a callback as an uncaught exception
		const results = await Promise.allSettled((keyData || []).map((fileName) => fs.promises.unlink(baseFolderPath + fileName)));
		results.forEach((result, index) => {
			if (result.status === 'rejected' && result.reason?.code !== 'ENOENT') logError(result.reason, `[DISK-REMOVE] - ${keyData?.[index]}`);
		});

		return results.filter((result) => result.status === 'fulfilled').length;
	}

}