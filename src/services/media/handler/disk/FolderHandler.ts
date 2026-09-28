import fs from 'fs';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../../../utils';

// Others
import Config from '../../../../config';
import FolderConfig from '../../config/FolderConfig';

//--------------------------------------------------------------

const makeNewDir = async (folderPath: string) => {
	try {
		folderPath = `${Config.STORAGE.LOCAL_FOLDER}/${folderPath}`;
		if (!fs.existsSync(folderPath)) await fs.mkdirSync(folderPath);
	} catch (e: any) {
		// 
	}
}

export default async (): Promise<void> => {
	try {
		await makeNewDir('');

		const folders: any = FolderConfig;
		for (const key in folders) {
			makeNewDir(folders[key]?.FOLDER);
		}
	} catch (e: any) {
		logError(`[DISK] - folder not created - Error: ${typeof e === 'string' ? e : e.message}`, null);
		if (!process.env.APP_DEBUG) process.exit(0);
	}
}