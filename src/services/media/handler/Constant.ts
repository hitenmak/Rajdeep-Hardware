// Others
import Config from '../../../config';

//--------------------------------------------------------------

export const IS_LOCAL_STORAGE = Config.STORAGE.IS_LOCAL; // true: upload in local | false: upload in s3 bucket

export const LOCAL_STORAGE_FOLDER = Config.STORAGE.LOCAL_FOLDER; // folder name store in local

export const DEFAULT_FOLDER = 'default'; // default files folder name

export const TEMP_FOLDER_NAME = '.temp'; // add new uploaded file temp this folder

export const MAX_FILE_SIZE_MB = Config.STORAGE.MAX_FILE_SIZE_MB;

export const ALLOW_FILE_TYPES: any = {
	image: ['jpeg', 'jpg', 'png', 'webp', 'heif', 'avif', 'tif', 'tiff', 'jfif', 'svg'], // 'bmp', 'gif'
	video: ['webm', 'mkv', 'gif', 'mov', 'mp4', 'm4p', 'm4v', '3gp',],
	audio: ['mp4', 'mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'aiff', 'wma', 'mid', 'au', 'voc', 'vox', 'opus', 'amr', 'alac', 'midi', 'raw', 'pcm', 'dat', 'unknown'],
	apk: ['apk'],
	document: ['docx', 'xlsx', 'xls', 'pdf', 'ppt', 'pptm', 'xps', 'potx', 'ppsx', 'ppsm', 'pps', 'pptx', 'odp', 'csv', 'jpeg', 'jpg', 'png', 'webp', 'heif', 'avif', 'tif', 'tiff', 'jfif', 'svg'],
	attachment: ['docx', 'xlsx', 'xls', 'pdf', 'ppt', 'pptm', 'xps', 'potx', 'ppsx', 'ppsm', 'pps', 'pptx', 'odp', 'csv', 'jpeg', 'jpg', 'png', 'webp', 'heif', 'avif', 'tif', 'tiff', 'jfif', 'svg'],
};
