// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../../utils';

// import * as s3 from './s3';
import * as disk from './disk';

//--------------------------------------------------------------

export default async (): Promise<void> => {

	// await s3.Connection();

	await disk.FolderHandler();
}