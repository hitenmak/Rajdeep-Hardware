import moment from 'moment';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getNum } from './';

//--------------------------------------------------------------

export const formatDate = (date: Date | string | null, format: string = 'D MMM YYYY'): string => {
    try {
        return empty(date) ? '' : moment(date, 'YYYY-MM-DDTHH:mm:ss.SSS').format(format);
    } catch (e: any) {
        return '';
    }
}

export const timeSince = (date: Date | string | null): string => {
    try {
        return empty(date) ? '' : moment(date, 'YYYY-MM-DDTHH:mm:ss.SSS').fromNow();
    } catch (e: any) {
        return '';
    }
}

export const convertToDate = (timestamp: any): Date | string => {
    try {
        if (!isNaN(timestamp) && timestamp.length === 10) {
            return new Date(parseInt(timestamp) * 1000);
        } else {
            return new Date(timestamp);
        }
    } catch (e: any) {
        return '';
    }
}

export const dateDifference = (date: string): any | string => {
    try {
        const currentDate = new Date().getTime();
        const newDate = new Date(date).getTime();

        const diffMilliseconds = Math.abs(currentDate - newDate);
        const diffHours = diffMilliseconds / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        return {
            hours: getNum(diffHours),
            days: getNum(diffDays)
        };
    } catch (e: any) {
        return '';
    }
}

export const ageDifferenceInYear = (date: string): any | string => {
    try {
        const birthDate = new Date(date);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }

        return date ? age : 0;
    } catch (e: any) {
        return '';
    }
}

export const futureDate = (currentDate: Date = new Date(), numOfDay: number): string => {
    try {
        const future = moment(currentDate).add(numOfDay, 'days');
        return future.format('YYYY-MM-DD');
    } catch (e: any) {
        return '';
    }
}

export const weekendDayCheck = (currentDate: Date = new Date(), dayName: string = 'Sunday'): boolean => {
    try {
        return moment(currentDate).format('dddd') === dayName;
    } catch (e: any) {
        return false;
    }
}

export const futureYearDate = (date: string, year: number, endOfMonth = false): string => {
    try {
        const currentDate = moment(date);
        let futureDate = currentDate.add(year, 'years');
        if (endOfMonth) futureDate = futureDate.endOf('month');

        return futureDate.format('YYYY-MM-DD');
    } catch (e: any) {
        return '';
    }
}

export const checkDateExpired = (expiryDate: string | Date, currentDate: Date = new Date()): boolean | string => {
    try {
        const expiry = new Date(expiryDate);
        const current = currentDate ? new Date(currentDate) : new Date();

        if (isNaN(expiry.getTime()) || isNaN(current.getTime())) {
            return 'Invalid date format';
        }
        return expiry < current;
    } catch (e: any) {
        return '';
    }
}
