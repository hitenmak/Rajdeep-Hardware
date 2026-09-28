import * as path from 'path';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../../../utils';

// Others
import { MAX_FILE_SIZE_MB, ALLOW_FILE_TYPES } from './Constant';

// Interfaces
import { IFieldConfigRow } from './interfaces';

//--------------------------------------------------------------

export const convertToMultidimensional = (data: any): {} => {
	if (empty(data)) return {};
	const result = {};

	Object.keys(data).forEach((key) => {
		const keys = key.replace(/\]/g, '').split('[');
		let temp: any = result;
		for (let i = 0; i < keys.length - 1; i++) {
			temp[keys[i]] = temp[keys[i]] || {};
			temp = temp[keys[i]];
		}
		temp[keys[keys.length - 1]] = data[key];
	});

	return result;
}

export const formatFileName = (data: any) => {
	let files = data.files;
	if (!empty(files)) {
		if (Array.isArray(files)) {
			files.forEach((r, i) => {
				if (empty(r.filename)) files[i].filename = r.key;
			});
		} else {
			let keys = Object.keys(files);
			keys.forEach((k) => {
				if (!empty(files[k])) {
					files[k].forEach((r: any, i: any) => {
						if (empty(r.filename)) files[k][i].filename = r.key;
					});
				}
			});
		}
	}
	return files;
}

export const formatBytes = (bytes: number, decimals = 2): string => {
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const getErrorMessage = (e: any = null): any => {
	if (!empty(e) && typeof e === 'string') {
		const eList = e.split('|');
		const code = eList[0];
		const message = (eList[1] || '').trim();
		e = { code, message: message || code };
	}
	return (
		{
			LIMIT_FILE_SIZE: `File Size is too large. Allowed fil size is ${formatBytes(MAX_FILE_SIZE_MB)}`,
			FILE_TYPE_NOT_ALLOW: e.message,
		}[e.code as string] ||
		e.message ||
		'File not uploaded'
	);
}

export const fileFilter = (types?: string[]): any => {
	return (req: any, file: any, cb: any): any => {
		const extension = path.extname(file.originalname).replace(/^./, '').toLowerCase();
		const allowedExtensions = (types || Object.keys(ALLOW_FILE_TYPES)).reduce((acc, type) => {
			const allowed = ALLOW_FILE_TYPES[type];
			return allowed ? acc.concat(allowed) : acc;
		}, [] as string[]);

		if (!allowedExtensions.includes(extension)) {
			const typeDetails = (types || Object.keys(ALLOW_FILE_TYPES.image)).map((type) => `${type}: ${ALLOW_FILE_TYPES[type]?.join(', ') || 'None'}`).join(' | ');
			return cb(new Error(`FILE_TYPE_NOT_ALLOW | Allowed file types are: ${typeDetails}`), false);
		}
		return cb(null, true);
	};
};

const extractCustomMessage = (validation: string): any => {
	return {
		validation: (validation.replace(/\(.*?\)/, '') || '').trim(), // Extract the content between parentheses
		message: validation.match(/\(([^)]+)\)/)?.[1] || '', // Replace the content between parentheses with an empty string
	};
}

// file validations
export const fieldConfigs = (fields: any = {}): IFieldConfigRow[] => {
	try {
		if (empty(fields)) return [];

		// field key rows {
		const fileValidations: any = [];
		for (const key in fields) {
			const fileFieldValidation = { name: key, maxCount: 1 }; // add formated validation

			const validationList = fields[key].trim().split('|');

			// check validations {
			for (const exp of validationList) {
				let extractedValidation = extractCustomMessage(exp);
				// let customMessage = extractedValidation.message;

				let expFull: string[] = extractedValidation.validation.split(':');
				let expKey: string = expFull[0];

				// bind validation {
				switch (expKey.trim()) {
					case 'max':
						fileFieldValidation.maxCount = expFull?.[1] ? parseInt(expFull[1]) : 99;
						break;
				}
				// } bind validation
			}
			// } check validations

			fileValidations.push(fileFieldValidation);
		}
		// } field key rows

		return fileValidations;
	} catch (e: any) {
		logError(e)
		return [];
	}
}

export const formatFiles = (files: any, configs: IFieldConfigRow[], isDetails: boolean = false): any => {
	try {
		if (empty(files)) return {};
		const data: any = {};
		configs.forEach((r) => {
			if (r.maxCount === 1) {
				data[r.name] = null;
				if (!empty(files[r.name]?.[0])) {
					const details = files[r.name][0];
					details.key = (details.key || details.filename || '').match(/[^\/]+$/)[0];
					data[r.name] = isDetails ? details : details.key;
				}
			} else {
				data[r.name] = [];
				if (!empty(files[r.name]?.[0])) {
					files[r.name].forEach((f: any) => {
						f.key = (f.key || f.filename || '').match(/[^\/]+$/)[0];
						data[r.name].push(isDetails ? f : f.key);
					});
				}
			}
		});

		// convert files to object
		return convertToMultidimensional(data);
	} catch (e: any) {
		logError(e)
		return {};
	}
}
