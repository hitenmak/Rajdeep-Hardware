// Helpers
import { empty, getNum, getStr, parseWorkbook, buildWorkbookBuffer } from '../../../utils';
import { VALID_STATUSES, resolveRowAttributes, splitAttributeRows } from '../product-import-export/helper';

export { VALID_STATUSES };

//--------------------------------------------------------------
/*
    Bulk product update, in two modes:
    - Stock & Price Update: only ever touches pricing.price /
      inventory.globalStock (or, for a Variable product's variation, the matching
      variation.price / .stockQuantity) and the matching lowStockThreshold.
    - Full Details Update: additionally touches Product Name / Brand / Description /
      Status / Image and every one of the category's resolved attribute values.
    Both match every row purely by SKU (a product's baseSku for Simple, or a
    variation's sku for Variable) against what's already in the database, and both
    treat a blank cell as "leave this field unchanged" - only cells the admin actually
    filled in get written.
*/

export const TEMPLATE_COLUMNS = ['SKU', 'Product Name', 'Type', 'Variation', 'Price', 'Stock', 'Low Stock Threshold', 'Image'];
export const FULL_TEMPLATE_BASE_COLUMNS = ['SKU', 'Product Name', 'Type', 'Variation', 'Brand', 'Description', 'Status', 'Price', 'Stock', 'Low Stock Threshold', 'Image URL'];

export { parseWorkbook, buildWorkbookBuffer };

export const validateHeaders = (rows: any[]): string | null => {
    if (!rows.length) return 'The file has no data rows.';
    if (!Object.keys(rows[0]).includes('SKU')) return 'Missing required column: SKU';
    return null;
}

export interface IUpdateRowResult {
    row: number;
    data: any;
    errors: string[];
}

// parses one row - only SKU is required, the rest are optional (blank = leave that
// field unchanged) {
export const validateRowShape = (row: any, rowNumber: number): IUpdateRowResult => {
    const errors: string[] = [];
    const sku = getStr(row['SKU']);

    if (empty(sku)) errors.push('SKU is required.');

    const parseOptionalNumber = (raw: any, label: string): number | null => {
        if (empty(raw)) return null;
        if (isNaN(Number(raw)) || Number(raw) < 0) { errors.push(`Invalid ${label}.`); return null; }
        return Number(raw);
    }

    const price = parseOptionalNumber(row['Price'], 'Price');
    const stockProvided = !empty(row['Stock']);
    const stock = parseOptionalNumber(row['Stock'], 'Stock');
    const lowStockProvided = !empty(row['Low Stock Threshold']);
    const lowStockThreshold = parseOptionalNumber(row['Low Stock Threshold'], 'Low Stock Threshold');

    return {
        row: rowNumber,
        data: {
            sku,
            price,
            priceProvided: !empty(row['Price']),
            stock: stock !== null ? Math.round(stock) : null,
            stockProvided,
            lowStockThreshold: lowStockThreshold !== null ? Math.round(lowStockThreshold) : null,
            lowStockProvided,
        },
        errors,
    };
}

export const combinationLabel = (variation: any, resolvedAttributes: any[]): string => {
    return (variation.attributeValues || [])
        .map((av: any) => {
            const attr = (resolvedAttributes || []).find((a: any) => a.attributeId === getStr(av.attributeId));
            const value = attr?.allowedValues?.find((v: any) => v.id === getStr(av.attributeValueId));
            return attr && value ? `${attr.name}: ${value.value}` : null;
        })
        .filter(Boolean)
        .join(', ');
}

// -------------------- Full Details Update --------------------

export interface IFullUpdateRowResult {
    row: number;
    data: any;
    errors: string[];
}

// same field set as the Stock & Price row, plus Name/Brand/Description/Status/Image -
// every one of them optional, blank meaning "leave unchanged" {
export const validateFullRowShape = (row: any, rowNumber: number): IFullUpdateRowResult => {
    const errors: string[] = [];
    const sku = getStr(row['SKU']);
    if (empty(sku)) errors.push('SKU is required.');

    const parseOptionalNumber = (raw: any, label: string): number | null => {
        if (empty(raw)) return null;
        if (isNaN(Number(raw)) || Number(raw) < 0) { errors.push(`Invalid ${label}.`); return null; }
        return Number(raw);
    }

    const status = getStr(row['Status']).toUpperCase();
    if (!empty(row['Status']) && !VALID_STATUSES.includes(status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);

    const imageUrl = getStr(row['Image URL']);
    if (!empty(imageUrl) && !/^https?:\/\//i.test(imageUrl)) errors.push('Image URL must start with http:// or https://');

    const price = parseOptionalNumber(row['Price'], 'Price');
    const stock = parseOptionalNumber(row['Stock'], 'Stock');
    const lowStockThreshold = parseOptionalNumber(row['Low Stock Threshold'], 'Low Stock Threshold');

    return {
        row: rowNumber,
        data: {
            sku,
            name: getStr(row['Product Name']), nameProvided: !empty(row['Product Name']),
            brand: getStr(row['Brand']), brandProvided: !empty(row['Brand']),
            description: getStr(row['Description']), descriptionProvided: !empty(row['Description']),
            status, statusProvided: !empty(row['Status']),
            imageUrl, imageUrlProvided: !empty(imageUrl),
            price, priceProvided: !empty(row['Price']),
            stock: stock !== null ? Math.round(stock) : null, stockProvided: !empty(row['Stock']),
            lowStockThreshold: lowStockThreshold !== null ? Math.round(lowStockThreshold) : null, lowStockProvided: !empty(row['Low Stock Threshold']),
            raw: row, // kept only until resolveRowAttributeUpdates runs against it - stripped before staging into the session
        },
        errors,
    };
}

// same per-inputType parsing as a create-import row (see product-import-export/helper's
// resolveRowAttributes), except a blank cell is simply skipped instead of being
// flagged "required" - this is a partial update, not creating a brand new product, so
// "not mentioned" legitimately means "leave whatever this product already has" {
export const resolveRowAttributeUpdates = (resolvedAttributes: any[], rawRow: any): { attributeRows: any[]; errors: string[] } => {
    return resolveRowAttributes((resolvedAttributes || []).map((a: any) => ({ ...a, isRequired: false })), rawRow);
}

export { splitAttributeRows };

// replaces whatever value(s) an existing attributes/attributeValues array holds for
// each attributeId present in `updates` with the new value(s), leaving every other
// attribute on the array completely untouched {
export const applyAttributeValueUpdates = (existing: any[], updates: any[]): any[] => {
    if (!updates.length) return existing || [];
    const updateIds = new Set(updates.map((u: any) => u.attributeId));
    return [...(existing || []).filter((a: any) => !updateIds.has(getStr(a.attributeId))), ...updates];
}

export const formatAttributeValueForExport = (attr: any, product: any): string => {
    const values = (product.attributes || []).filter((a: any) => getStr(a.attributeId) === attr.attributeId);
    if (!values.length) return '';
    if (attr.inputType === 'MULTI_SELECT') {
        return values.map((v: any) => (attr.allowedValues.find((av: any) => av.id === getStr(v.attributeValueId)) || {}).value).filter(Boolean).join(', ');
    }
    const v = values[0];
    if (attr.inputType === 'SELECT' || attr.inputType === 'COLOR') return (attr.allowedValues.find((av: any) => av.id === getStr(v.attributeValueId)) || {}).value || '';
    if (attr.inputType === 'BOOLEAN') return v.textValue === 'true' ? 'Yes' : (v.textValue === 'false' ? 'No' : '');
    if (attr.inputType === 'NUMBER' || attr.inputType === 'MEASUREMENT') return !empty(v.numericValue) ? v.numericValue : '';
    return v.textValue || '';
}

export const formatVariationAttributeValueForExport = (attr: any, variation: any): string => {
    const match = (variation.attributeValues || []).find((av: any) => getStr(av.attributeId) === attr.attributeId);
    if (!match) return '';
    return (attr.allowedValues.find((av: any) => av.id === getStr(match.attributeValueId)) || {}).value || '';
}
