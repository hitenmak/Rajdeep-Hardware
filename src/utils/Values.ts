import mongoose, { Types } from 'mongoose';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from './';

//--------------------------------------------------------------

export const getTrim = (data: string) => {
    return data.trim();
}

export const empty = (data: any): boolean => {
    if (data instanceof Date) return false;
    if ([undefined, 'undefined', null, 'null', ''].includes(data) || (typeof data === 'object' && Object.keys(data).length === 0)) return true;
    return typeof data === 'string' && !data.trim().length;
}

export const getStr = (value: any): string => {
    if (empty(value)) return '';
    if (isObjectId(value)) return value.toString();
    return typeof value !== 'object' ? getTrim(value + '') : '';
}

export const getBool = (value: any): boolean => {
    if (empty(value)) return false;
    if (['false', false, 0, '0'].includes(value)) return false;
    if (['true', true, 1, '1'].includes(value)) return true;
    return false;
}

export const getNum = (value: any, defaultVal: number = 0): number => {
    return isFinite(value) ? +value : defaultVal;
}

export const isEqual = (v1: any, v2: any, isConvertString = true): boolean => {
    return isConvertString ? (v1 + '' === v2 + '') : v1 === v2;
}

export const isObjectId = (value: any): boolean => {
    return mongoose.Types.ObjectId.isValid(value);
}

export const toObjectId = (value: any): Types.ObjectId => {
    return new mongoose.Types.ObjectId(value);
}

export const formatKey = (data: string | number, keyWith: string = '-', isUpperCase: boolean = true): string | null => {
    try {
        data = (data as string).toString();
        return empty(data) ? '' : (isUpperCase ? data.toUpperCase() : data.toLowerCase()).replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, keyWith);
    } catch (e: any) {
        return null;
    }
}

export const lower = (value: string | number | null | undefined): string | number | null | undefined => {
    return !value ? value : value.toString().toLowerCase();
}

export const upper = (value: string | number | null | undefined): string | number | null | undefined => {
    return !value ? value : value.toString().toUpperCase();
}

export const toFixedDecimals = (value: any, decimals: number = 8): number | null | undefined => {
    if (typeof value === 'object') value = Number(value);
    if (typeof value === 'string') value = Number(value);
    return Number((value || 0).toFixed(decimals));
}

export const formatNumber = (value: any, decimals: number = 4): string | number | null | undefined => {
    value = toFixedDecimals(value, decimals)
    return value.toFixed(decimals);
}

export const percentage = (amount: string | number, percent: string | number): any => {
    amount = getNum(amount);
    percent = getNum(percent);
    return toFixedDecimals((amount * percent) / 100);
}

export const randomNumber = (min: number, max: number, decimals: number = 4): number => {
    const random = Math.random() * (max - min) + min;
    return parseFloat(random.toFixed(decimals));
}

export const randomToken = (length = 12): string => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let trace = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        trace += characters[randomIndex];
    }

    return trace;
}
