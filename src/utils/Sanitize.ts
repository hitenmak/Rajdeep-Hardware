import _ from 'lodash';
import moment from 'moment';
import mongoose from 'mongoose';

// Models
import AllModels from '../models';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getNum, formatKey, getBool,  getStr, lower, upper, existsByField } from './';

//--------------------------------------------------------------

const CONFIG_SANITIZE = {
    shorttext: { min: 3, max: 50 },
    text: { min: 3, max: 100 },
    longtext: { min: 3, max: 1000 },
}

const CONFIG_VALIDATION = {
    email: { min: 3, max: 50 },
    phone: { min: 3, max: 20, allowedCountryCodes: [], allowSpaces: true },
    username: { min: 3, max: 20, allowedSpecialChars: ['_', '.'] },
    password: { min: 6, max: 20, allowSpaces: false, allowedSpecialChars: '' },
}

//--------------------------------------------------------------

const formatMessage = (msg: string, customMessage?: string): string => {
    return customMessage || msg;
    // return (customMessage || msg) + ', ';
}

const extractCustomMessage = (validation: string): any => {
    return {
        validation: (validation.replace(/\(.*?\)/, '') || '').trim(), // Extract the content between parentheses
        message: validation.match(/\(([^)]+)\)/)?.[1] || '', // Replace the content between parentheses with an empty string
    };
}

const splitCamelCase = (str: any) => {
    let result = '';

    for (let i = 0; i < str.length; i++) {
        if (i > 0 && str[i] === str[i].toUpperCase()) {
            result += ' ';
        }
        result += str[i];
    }

    return result.toLowerCase().charAt(0).toUpperCase() + result.toLowerCase().slice(1);
}

export const normalize = (data: any, validation: any): any => {
    // const normalizeData = {};
    for (const dataKey in validation) {
        let validationList: string[] = validation[dataKey].split('|');
        for (const exp of validationList) {
            const expFull: string[] = exp.split(':');
            let expKey: string = (expFull[0] || '').trim();

            if (expKey !== 'normalize' || empty(expFull[1])) continue;

            const normalizationList = expFull[1].split(',');
            for (const normalizationType of normalizationList) {
                switch (normalizationType.trim()) {
                    case 'lower':
                        data[dataKey] = lower(data[dataKey]);
                        break;

                    case 'upper':
                        data[dataKey] = upper(data[dataKey]);
                        break;

                    case 'number':
                        data[dataKey] = getNum(data[dataKey]);
                        break;

                    case 'string':
                        data[dataKey] = getStr(data[dataKey]);
                        break;

                    case 'boolean':
                        data[dataKey] = getBool(data[dataKey]);
                        break;

                    case 'sortObject':
                        if (data[dataKey]) {
                            const key: any = Object.keys(data[dataKey])[0];

                            if (data?.[dataKey]?.[key]) {

                                const sortingType: any = {
                                    '1': 1,
                                    '-1': -1,
                                    'ASC': 1,
                                    'DESC': -1,
                                };

                                data[dataKey][key] = (sortingType[(data[dataKey]?.[key] || '').toString().toUpperCase()]) || -1;
                                break;
                            }
                        }
                }
            }
        }
    }
    return data;
}

export const sanitize = async (rawData: any, validation: any): Promise<any> => {
    /*
        ......................
        - "*" is optional params

        - label (optional)
            USE:- add custom label for message
            NOTE:- label position is must be staring of validation string
            SYNTAX:- label: <You Label>
            EXAMPLE:- label: User Name

        - custom message
            USE:- add custom error message in specific validation
            NOTE:- custom message position is must be end of that validation and before of "|" pipe sign
            SYNTAX:- <validation type>: <params and values> (<Custom error message>) | <another validation>
            EXAMPLE:- min: 6 (password must be a 6 char required)


        ......................
        label
        ......................
        normalize: lower, upper, number, string, boolean
        ......................
        required | id
        ......................
        boolean | number | string
        ......................
        min | max | exact | between
        ......................
        maxlength | minlength | exactlength | uppercase | lowercase
        ......................
        in | objectId
        ......................
        date | email
        ......................
        array | object
        ......................
        : exist | unique

        exist
            USE:- validation passed: if value is exist in db
            SYNTAX:- exist: <Model Name>.<column>
            EXAMPLE:- exist: User.email

        unique
            USE:- validation passed: if value is not exist in db
            SYNTAX:- unique: <Model Name>.<column>,<*not consider column>,<*not consider key (get value from this from body)>
            EXAMPLE:- unique: unique: User.email,id,1

        ......................
        : matchwith

        matchwith
            USE:- validation passed: the value matches the required key-value pair.
            SYNTAX:- matchwith: <key>
            EXAMPLE:- matchwith: confirmPassword

        ......................
    */

    const ERROR_KEY = 'VALIDATE';

    // File upload error
    // if(rawData?._error) return rawData._error;
    if (rawData?.error) return { error: rawData.error, errorKey: ERROR_KEY, body: rawData };

    // Check Array Validation
    if (Array.isArray(validation)) return await checkArrayFormat(rawData, validation);

    // normalization data {
    rawData = normalize(rawData, validation);
    const body = { ...rawData };
    const records: any = {};
    // } normalization data

    // Check Object Validation
    let invalidCount: number = 0;
    let message: string = '';
    let messageObject: any = {};
    for (const dataKey in validation) {
        let validationList: string[] = validation[dataKey].split('|');
        let label = '';
        let isObjectIdValid = true;

        for (const exp of validationList) {
            let extractedValidation = extractCustomMessage(exp);
            let customMessage = extractedValidation.message;

            let expFull: string[] = extractedValidation.validation.split(':');
            let expKey: string = expFull[0];
            switch (expKey.trim()) {
                case 'label':
                    label = expFull?.[1];
                    break;

                case 'required':
                    if (!(dataKey in rawData) || empty(rawData[dataKey])) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field is required.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'objectId':
                    if (!empty(rawData[dataKey]) && !mongoose.Types.ObjectId.isValid(rawData[dataKey])) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field is not valid object id.`, customMessage);
                        invalidCount += 1;
                        isObjectIdValid = false;
                    }
                    break;

                case 'boolean':
                    if (!empty(rawData[dataKey]) && typeof rawData[dataKey] !== 'boolean') {
                        messageObject[dataKey] = formatMessage(`${(label || splitCamelCase(dataKey))} field is not a boolean.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'number':
                    if (!empty(rawData[dataKey]) && typeof rawData[dataKey] !== 'number') {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field is not a number.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'string':
                    if (!empty(rawData[dataKey]) && typeof rawData[dataKey] !== 'string') {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field is not a string.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'min':
                    if (!empty(rawData[dataKey]) && rawData[dataKey] < Number(expFull[1].trim())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field minimum value is ${expFull[1].trim()} recommended.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'max':
                    if (!empty(rawData[dataKey]) && rawData[dataKey] > Number(expFull[1].trim())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field maximum value is ${expFull[1].trim()} recommended.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'exact':
                    if (!empty(rawData[dataKey]) && rawData[dataKey] === Number(expFull[1].trim())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field must be exactly ${expFull[1].trim()} recommended.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'between':
                    const range = expFull[1].split(',');
                    if (!empty(rawData[dataKey]) && (rawData[dataKey] < Number(range[0].trim()) || rawData[dataKey] > Number(range[1].trim()))) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field value between ${expFull[1].trim()} recommended.`, customMessage);

                        invalidCount += 1;
                    }
                    break;

                case 'maxlength':
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString()).length > Number(expFull[1].trim())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field should be less than ${expFull[1].trim()} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'minlength':
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString()).length < Number(expFull[1].trim())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field should be greater than ${expFull[1].trim()} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'lengthbetween':
                    const lengthRange = expFull[1].split(',');
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString().length < Number(lengthRange[0].trim()) || rawData[dataKey].toString().length > Number(lengthRange[1].trim()))) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} length must be between ${lengthRange[0].trim()} and ${lengthRange[1].trim()} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'exactlength':
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString()).length !== Number(expFull[1].trim())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field must be exactly ${expFull[1].trim()} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'longtext':
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString().length > CONFIG_SANITIZE.longtext.max)) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field should be less than ${CONFIG_SANITIZE.longtext.max} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'text':
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString().length > CONFIG_SANITIZE.text.max)) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field should be less than ${CONFIG_SANITIZE.text.max} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'shorttext':
                    if (!empty(rawData[dataKey]) && (rawData[dataKey].toString().length > CONFIG_SANITIZE.shorttext.max)) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field should be less than ${CONFIG_SANITIZE.shorttext.max} characters.`, customMessage);
                        // if(!empty(rawData[dataKey]) && (rawData[dataKey].toString().length < CONFIG_SANITIZE.shorttext.min || rawData[dataKey].toString().length > CONFIG_SANITIZE.shorttext.max)) {
                        // messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} length must be between ${CONFIG_SANITIZE.shorttext.min} and ${CONFIG_SANITIZE.shorttext.max} characters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'in':
                    if (!empty(rawData[dataKey]) && !expFull[1].trim().split(',').includes(rawData[dataKey].toString())) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} field value is not in valid list value (${expFull[1].trim()}).`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'array':
                    if (!empty(rawData[dataKey]) && !Array.isArray(rawData[dataKey])) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} must be an array.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'objectkeysin':
                    if (!empty(rawData[dataKey])) {
                        if (!(typeof rawData[dataKey] === 'object')) {
                            messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} must be an object.`, customMessage);
                            invalidCount += 1;
                        } else {
                            // check object key in given list {
                            const keys = expFull[1].trim().split(',');
                            const inputObjectKeys = Object.keys(rawData[dataKey]);

                            for (const key in inputObjectKeys) {
                                if (keys.includes(key)) continue;
                                messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} object key must be in ${keys}`, customMessage);
                                invalidCount += 1;
                            }
                            // } check object key in given list
                        }
                    }
                    break;

                case 'object':
                    if (!empty(rawData[dataKey]) && !(typeof rawData[dataKey] === 'object')) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} must be an object.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'key':
                    if (!empty(rawData[dataKey]) && formatKey(rawData[dataKey]) !== (rawData[dataKey] || '').toString().toUpperCase()) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} value allow only alpha numeric and dash.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'uppercase':
                    if (!empty(rawData[dataKey]) && rawData[dataKey].toUpperCase() !== rawData[dataKey]) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} value allow only capital case letters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'lowercase':
                    if (!empty(rawData[dataKey]) && rawData[dataKey].toLowerCase() !== rawData[dataKey]) {
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} value allow only lower case letters.`, customMessage);
                        invalidCount += 1;
                    }
                    break;

                case 'arrayin':
                    const valueList = expFull[1].trim().split(',');
                    if (!empty(rawData[dataKey])) {
                        for (let value of rawData[dataKey]) {
                            value = (value || '').trim();
                            if (!valueList.includes(value.toString())) {
                                messageObject[dataKey] = formatMessage(`${label || dataKey} field value is not in valid list value (` + expFull[1].trim() + ')', customMessage);
                                invalidCount += 1;
                            }
                        }
                    }
                    break;

                case 'date':
                    const dynamicFormatKey = expFull[1]?.trim();
                    const formatParts = dynamicFormatKey?.split(',') || [];
                    const userFormat = formatParts[0]?.trim();
                    const constraints = formatParts.slice(1).map((c) => c.trim()); // Extract past/future constraints
                    const formats = userFormat ? [userFormat] : ['YYYY-MM-DD'];
                    let isValidDate = false;

                    if (!empty(rawData[dataKey])) {
                        // Validate date format
                        for (const format of formats) {
                            if (moment(rawData[dataKey], format.trim(), true).isValid()) {
                                isValidDate = true;
                                break;
                            }
                        }

                        if (!isValidDate) {
                            messageObject[dataKey] = formatMessage(`${(label || splitCamelCase(dataKey))} is not a valid date in the format ${formats.join(', ')}.`, customMessage);
                            invalidCount += 1;
                        } else {
                            // Check past/future constraints
                            const inputDate = moment(rawData[dataKey], userFormat, true);

                            if (constraints.includes('past') && inputDate.isAfter(moment())) {
                                messageObject[dataKey] = formatMessage(`${(label || splitCamelCase(dataKey))} cannot be a future date.`, customMessage);
                                invalidCount += 1;
                            }

                            if (constraints.includes('future') && inputDate.isBefore(moment())) {
                                messageObject[dataKey] = (messageObject[dataKey] || '') + formatMessage(`${(label || splitCamelCase(dataKey))} cannot be a past date.`, customMessage);
                                invalidCount += 1;
                            }
                        }
                    }
                    break;

                case 'email':
                    if (!empty(rawData[dataKey])) {
                        const validateResult = validateEmail(rawData[dataKey], label || splitCamelCase(dataKey));
                        if (!validateResult.isValid) {
                            messageObject[dataKey] = formatMessage(validateResult.error || `${label || splitCamelCase(dataKey)} is not a email address.`, customMessage);
                            invalidCount += 1;
                        }
                    }
                    break;

                case 'phone':
                    if (!empty(rawData[dataKey])) {
                        const validateResult = validatePhoneNumber(rawData[dataKey], label || splitCamelCase(dataKey));
                        if (!validateResult.isValid) {
                            messageObject[dataKey] = formatMessage(validateResult.error || `${label || splitCamelCase(dataKey)} is not a valid phone number.`, customMessage);
                            invalidCount += 1;
                        }
                    }
                    break;

                case 'username':
                    if (!empty(rawData[dataKey])) {
                        const validateResult = validateUsername(rawData[dataKey], label || splitCamelCase(dataKey));
                        if (!validateResult.isValid) {
                            messageObject[dataKey] = formatMessage(validateResult.error || `${label || splitCamelCase(dataKey)} is not a valid username.`, customMessage);
                            invalidCount += 1;
                        }
                    }
                    break;

                case 'password':
                    if (!empty(rawData[dataKey])) {
                        const validateResult = validatePassword(rawData[dataKey], label || splitCamelCase(dataKey));
                        if (!validateResult.isValid) {
                            messageObject[dataKey] = formatMessage(validateResult.error || `${label || splitCamelCase(dataKey)} is not a valid password formate.`, customMessage);
                            invalidCount += 1;
                        }
                    }
                    break;

                case 'exist':
                    if (!empty(rawData[dataKey])) {
                        if (isObjectIdValid) {
                            const value = rawData[dataKey];
                            const modelAndKey: string[] = expFull[1].trim().split('.');

                            const models: any = AllModels;
                            const record = await existsByField(models[modelAndKey[0]][modelAndKey[0]], modelAndKey.slice(1).join('.'), value);
                            if (!record) {
                                messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} value not exist in ${modelAndKey[0].toLowerCase()}.`, customMessage);
                                invalidCount += 1;
                            } else {
                                records[dataKey] = record;
                            }
                        }
                    }
                    break;

                case 'unique':
                    if (!empty(rawData[dataKey])) {
                        if (isObjectIdValid) {
                            const value = rawData[dataKey];
                            const modelAndKey: string[] = expFull[1].trim().split('.');

                            // split column name for query {
                            const columns = (modelAndKey.slice(1).join('.') || '').split(',');
                            const queryParams: any = { key: columns[0].trim(), value };
                            if (columns.length >= 3 && !empty(columns[2].trim())) {
                                queryParams.notConsiderKey = columns[1].trim();
                                queryParams.notConsiderValue = rawData[columns.slice(2).join(',').trim()];
                            }
                            // } split column name for query
                            const models: any = AllModels;
                            const record: any = await existsByField(models[modelAndKey[0]][modelAndKey[0]], queryParams.key, queryParams.value, queryParams.notConsiderKey, queryParams.notConsiderValue);
                            if (record) {
                                // message += formatMessage(`${label || dataKey} value already exist in ${modelAndKey[0].toLowerCase()}`, customMessage);
                                messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} already exist in ${modelAndKey[0].toLowerCase()}.`, customMessage);
                                invalidCount += 1;
                            } else {
                                records[dataKey] = record;
                            }
                        }
                    }
                    break;

                case 'sortObject':
                    if (!empty(rawData[dataKey])) {
                        const validateResult = validSingleSortKey(rawData[dataKey], expFull[1].trim().split(','), label || splitCamelCase(dataKey));
                        if (!validateResult.isValid) {
                            messageObject[dataKey] = formatMessage(validateResult.error || `${label || splitCamelCase(dataKey)} is not a valid object formate.`, customMessage);
                            invalidCount += 1;
                        }
                    }
                    break;

                case 'anyone':
                    const fields = expFull[1].trim().split(',');
                    const isAnyFieldPresent = fields.some((field) => rawData[field.trim()] && !empty(rawData[field.trim()]));
                    if (!isAnyFieldPresent) {
                        // message += formatMessage('Either ' + fields.join(' or ') + ' is required', customMessage);
                        messageObject[dataKey] = formatMessage('Either ' + fields.join(' or ') + ' is required', customMessage);
                        invalidCount += 1;
                    }
                    break;


                case 'matchwith':
                    const val1 = rawData[dataKey];
                    const val2 = rawData[expFull[1].trim()];
                    if (val1 !== val2) {
                        // message += formatMessage(lower(label || dataKey) + ' and ' + expFull[1].trim() + ' do not match', customMessage);
                        messageObject[dataKey] = formatMessage(`${label || splitCamelCase(dataKey)} and ${expFull[1].trim()} do not match.`, customMessage);
                        invalidCount += 1;
                    }
                    break;
            }
        }
    }

    // if (!rawData.message && (!rawData.attachments || rawData.attachments.length === 0)) {
    //     message += 'Either message or attachments is required.';
    //     invalidCount += 1;
    // }

    // if(message.length) message = message.slice(0, -2);
    message = Object.values(messageObject).join(', ');
    return message.length ? { error: message, errors: messageObject, errorKey: ERROR_KEY, body } : { body, records };
    // return message.length ? {error: message.slice(0, -2), errorKey: ERROR_KEY} : {};
}

export const checkArrayFormat = async (arrayData: any, validation: any): Promise<any> => {
    const ERROR_KEY = 'VALIDATE-CHECK-ARRAY-FORMAT';

    if (!Array.isArray(arrayData)) return { error: 'This is not a array', errorKey: ERROR_KEY, body: arrayData };
    validation = validation[0];

    let invalidIndex: string[] = [];
    let errors: string[] = [];

    for (const i in arrayData) {
        const r = arrayData[i];
        const sanitizeResult = await sanitize(r, validation);
        arrayData[i] = sanitizeResult.body;
        if (sanitizeResult?.error) {
            errors.push(sanitizeResult?.errors);
            invalidIndex.push(i);
        }
    }

    let message = `Index number ${invalidIndex.join(',')} ${invalidIndex.length > 1 ? 'are' : 'is'} invalid formats.`;
    // return invalidIndex.length ? `${message} - ${_.uniq(errors).join(', ')}` : '';
    return invalidIndex.length ? { error: `${message} - ${_.uniq(errors).join(', ')}`, errors, errorKey: ERROR_KEY, body: arrayData } : { body: arrayData };
}

const validateEmail = (email: string | null | undefined, label?: string | undefined | null,) => {
    // Length check
    if (empty(email)) return { isValid: true };
    if (!label) label = 'email';

    const errors = [];
    // @ts-ignore
    if (email.length < CONFIG_VALIDATION.email.min || email.length > CONFIG_VALIDATION.email.max)
        errors.push(`${label} length must be between ${CONFIG_VALIDATION.email.min} and ${CONFIG_VALIDATION.email.max} characters`);

    const isRegexPass = !String(email || '').toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    if (isRegexPass) errors.push(`Invalid ${label} format.`);

    return { isValid: errors.length === 0, error: errors.join(', ') };
}

const validatePhoneNumber = (phone: string | number | null | undefined, label?: string | undefined | null, options: any = {}) => {
    return { isValid: true, error: '' }; // by pass phone validation

    /* if(!phone) return {isValid: true};
    if(!label) label = 'phone number';

    const {
        allowedCountryCodes = CONFIG_VALIDATION.phone.allowedCountryCodes, // [] allows all, ['+1', '+91'] for specific
        minLength = CONFIG_VALIDATION.phone.min, // minimum length (without country code)
        maxLength = CONFIG_VALIDATION.phone.max, // maximum length (without country code)
        allowSpaces = CONFIG_VALIDATION.phone.allowSpaces, // allow spaces and brackets
    } = options;

    const errors = [];
    // escape special characters for regex (dynamic country codes)
    const countryCodePattern = allowedCountryCodes.map((code: any) => code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    // country code pattern (optional if empty array)
    const countryPattern = allowedCountryCodes.length === 0
        ? `(?:${countryCodePattern})?` // Optional
        : `(?:${countryCodePattern})`; // Required

    // allow spaces and brackets if enabled
    const separatorPattern = allowSpaces ? '[\\s()]*' : '';

    // build the validation regex
    const regex = new RegExp(`^${countryPattern}${separatorPattern}(\\d{${minLength},${maxLength}})$`);

    // clean input: allow digits, spaces, brackets, and '+'
    const cleanedPhone = (phone || '').toString().replace(/[^\d+\s()]/g, '');

    // check allowed country code
    if(allowedCountryCodes.length > 0 && !new RegExp(`^${countryCodePattern}`).test(cleanedPhone))
        errors.push(`${label} Invalid country code`);
    // errors.push(`${label} Invalid country code. Allowed: ${allowedCountryCodes.join(', ')}`);

    // length check
    const digitsOnly = cleanedPhone.replace(/\D/g, '');
    if(digitsOnly.length < minLength || digitsOnly.length > maxLength)
        errors.push(`${label} length must be between ${minLength} and ${maxLength} digits`);

    // validate full pattern
    if(!regex.test(cleanedPhone))
        errors.push(`Invalid ${label} format.`);

    return {isValid: errors.length === 0, error: errors.join(', ')}; */
}

const validateUsername = (username: string | number | null | undefined, label?: string | undefined | null, options: any = {}) => {
    if (!username) return { isValid: true };
    if (!label) label = 'username';

    const {
        minLength = CONFIG_VALIDATION.username.min, // Minimum length
        maxLength = CONFIG_VALIDATION.username.max, // Maximum length
        allowedSpecialChars = CONFIG_VALIDATION.username.allowedSpecialChars, // Array of allowed special characters
    } = options;

    const errors = [];

    username = (username || '').toString();

    // Length check
    if (username.length < minLength || username.length > maxLength)
        errors.push(`${label} length must be between ${minLength} and ${maxLength} characters`);

    // Escape special characters for regex
    const escapedChars = allowedSpecialChars.map((char: any) => `\\${char}`).join('');

    // Regex to validate username
    const regex = new RegExp(`^[a-z0-9](?:[a-z0-9${escapedChars}]*[a-z0-9])?$`, 'i');

    if (!regex.test(username)) errors.push(`Invalid ${label} format. Allowed characters: a-z, 0-9, ${allowedSpecialChars.join(', ')} (not at start or end).`);

    return { isValid: errors.length === 0, error: errors.join(', ') };
}

const validatePassword = (password: string | null | undefined, label?: string | undefined | null, options: any = {}) => {
    if (!password) return { isValid: true };
    if (!label) label = 'password';

    const {
        minLength = CONFIG_VALIDATION.password.min, // Minimum length
        maxLength = CONFIG_VALIDATION.password.max, // Maximum length
        allowedSpecialChars = CONFIG_VALIDATION.password.allowedSpecialChars, // Allowed special characters (empty = allow all)
    } = options;

    const errors = [];

    password = (password || '').toString();

    // Length check
    if (password.length < minLength || password.length > maxLength)
        errors.push(`${label} length must be between ${minLength} and ${maxLength} characters`);

    // Escape special characters for regex
    let specialCharsPattern = allowedSpecialChars === ''
        ? '\\W' // Allow all special characters except spaces
        : allowedSpecialChars.split('').map((char: any) => `\\${char}`).join('');

    // Regex to validate password (no spaces allowed)
    const regex = new RegExp(`^[a-zA-Z0-9${specialCharsPattern}]+$`);

    if (!regex.test(password) || /\s/.test(password))
        errors.push(`Invalid ${label} format. Allowed characters: a-z, A-Z, 0-9${allowedSpecialChars === '' ? ', all special characters' : `, ${allowedSpecialChars}`}, but spaces are NOT allowed.`);

    return { isValid: errors.length === 0, error: errors.join(', ') };
}

const validSingleSortKey = (sortObject: any, allowedKeys: string[], label?: string | undefined | null, options: any = {}) => {

    if (!label) label = 'sort';
    const keys = Object.keys(sortObject);

    const errors = [];
    // Check if exactly one key exists
    if (keys.length !== 1) errors.push(`${label} must be an object with only one key.`);

    const key = keys[0];
    if (!allowedKeys.includes(key)) errors.push(`${label} allow only (${allowedKeys}) keys`);
    if (![1, -1].includes(sortObject[key])) errors.push(`${label} value must be either 1 or -1.`);

    return { isValid: errors.length === 0, error: errors.join(', ') };
}
