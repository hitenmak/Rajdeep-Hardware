import moment from 'moment';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from './';

//--------------------------------------------------------------

export const makeList = (data: any[], keyName: string = '_id', isConvertString: boolean = false): string[] => {
    try {
        if (!data) return [];

        const newData: any[] = [];
        data.forEach((r: any) => {
            newData.push(isConvertString ? r[keyName].toString() : r[keyName]);
        });

        return newData;
    } catch (e: any) {
        logError(data);
        logError(e)
        return [];
    }
}

export const flipOnKey = (data: any, keyName: string = '_id'): {} => {
    if (empty(data)) return {};

    const newData: any = {};
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };
    data.forEach((r: any) => {
        const key = getNestedValue(r, keyName);
        if (key !== undefined && key !== null) newData[key] = r;
    });

    return newData;
}

export const isSameData = (oldData: any, newData: any, labelRef: any = {}): {} => {
    if (typeof oldData !== typeof newData) return false;

    if (Array.isArray(oldData)) {
        if (oldData.length !== newData.length) return false;
        return oldData.every((item, index) => isSameData(item, newData[index]));
    }

    if (typeof oldData === 'object' && oldData !== null) {
        const keys1 = Object.keys(oldData);
        const keys2 = Object.keys(newData);
        if (keys1.length !== keys2.length) return false;
        return keys1.every(key => isSameData(oldData[key], newData[key]));
    }

    return oldData === newData;
}

export const getDiffObject = (oldData: Record<string, any>, newData: Record<string, any>, labelRef: any = {}): { oldData: Record<string, any>; newData: Record<string, any> } => {
    let oldResult: Record<string, any> = {};
    let newResult: Record<string, any> = {};

    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

    for (const key of allKeys) {
        const oldVal = oldData?.[key];
        const newVal = newData?.[key];

        const nestedLabelRef = typeof labelRef === 'object' ? labelRef[key] : undefined;

        if (typeof nestedLabelRef === 'string') {
            if (oldVal !== null && newVal !== null && typeof oldVal === 'object' && typeof newVal === 'object' && !Array.isArray(oldVal) && !Array.isArray(newVal)) {
                const nested = getDiffObject(oldVal, newVal, {});
                Object.assign(oldResult, nested.oldData);
                Object.assign(newResult, nested.newData);
            } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    oldResult[nestedLabelRef] = oldVal;
                    newResult[nestedLabelRef] = newVal;
                }
            } else if (oldVal !== newVal) {
                oldResult[nestedLabelRef] = oldVal;
                newResult[nestedLabelRef] = newVal;
            }
        } else if (typeof nestedLabelRef === 'object') {
            const nested = getDiffObject(oldVal || {}, newVal || {}, nestedLabelRef);
            Object.assign(oldResult, nested.oldData);
            Object.assign(newResult, nested.newData);
        }
    }

    return { oldData: oldResult, newData: newResult };
}
