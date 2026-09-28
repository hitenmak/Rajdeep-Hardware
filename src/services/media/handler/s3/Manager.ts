import * as clientS3 from '@aws-sdk/client-s3';
import * as path from 'path';
import multerS3 from 'multer-s3';
import multer from 'multer';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../../../../utils';
import { fileFilter } from '../Utils';
import s3 from './Config';

// Others
import Config from '../../../../config';
import { ALLOW_FILE_TYPES, MAX_FILE_SIZE_MB } from '../Constant';
import { DEFAULT_FOLDER } from '../Constant';

//--------------------------------------------------------------

export default class Manager {

	static baseUrl(isFullUrl: boolean = true): string {
		return `${Config.AWS_S3_BUCKET.BASE_URL}/`;
	}

	static defaultMedia(image: string | null, isFullUrl: boolean = true): string {
		return image ? `${this.baseUrl(isFullUrl)}${DEFAULT_FOLDER}/${image}` : '';
	}

	static mediaUrl(folder: string, image: string | null, defaultMediaName: string | null = '', isFullUrl: boolean = true): string {
		return image ? `${this.baseUrl(isFullUrl)}${folder ? folder + '/' : ''}${image}` : this.defaultMedia(defaultMediaName);
	}

	static upload(folderPath: string, allowFileTypes?: string[]): any {
		const resolvedFileTypes = allowFileTypes || Object.keys(ALLOW_FILE_TYPES.image);
		return multer({
			storage: multerS3({
				s3,
				acl: '', // public-read
				bucket: Config.AWS_S3_BUCKET.BUCKET_NAME,
				contentType: multerS3.AUTO_CONTENT_TYPE,
				key: (req: any, file: any, cb: any) => {
					const fileName = `${folderPath ? folderPath + '/' : ''}${Date.now()}X${Math.round(
						Math.random() * 1e9
					)}${path.extname(file.originalname)}`;
					cb(null, fileName);
				},
			}),
			fileFilter: fileFilter(resolvedFileTypes),
			limits: {
				fileSize: MAX_FILE_SIZE_MB * 1048576,
			},
		});
	}

	static async remove(keyData: null | string | string[], folderPath: string = ''): Promise<any> {
		if (empty(keyData)) return null;
		if (!empty(folderPath)) folderPath = folderPath + '/';
		if (typeof keyData === 'string') keyData = [keyData];

		// @ts-ignore
		const deleteKeys: any = keyData.map((key) => {
			return { Key: folderPath + key };
		});

		const { Deleted } = await s3.send(
			new clientS3.DeleteObjectsCommand({
				Bucket: Config.AWS_S3_BUCKET.BUCKET_NAME,
				Delete: { Objects: deleteKeys },
			})
		);
		return Deleted;
	}

}