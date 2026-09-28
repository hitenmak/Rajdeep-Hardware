// Helpers
import { empty, getNum, getStr, formatKey, parseWorkbook, buildWorkbookBuffer } from '../../../utils';

//--------------------------------------------------------------
/*
    Product bulk import/export. Supports both Simple and Variable products - a
    Variable product is described by multiple rows that share the same "Product
    Group" value, one row per variation, each with its own SKU/price/stock plus
    whichever attribute columns are flagged as variation attributes for that
    category (see resolveRowAttributes below).
*/

export const IMPORT_COLUMNS = ['Product Group', 'SKU', 'Product Type', 'Product Name', 'Category', 'Subcategory', 'Brand', 'Description', 'Price', 'Sale Price', 'Stock', 'Low Stock Threshold', 'Status', 'Image URL'];
export const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
export const VALID_PRODUCT_TYPES = ['SIMPLE', 'VARIABLE'];

export { parseWorkbook, buildWorkbookBuffer };

// validates the file actually has (at least) the columns we need, before touching any rows {
export const validateHeaders = (rows: any[]): string | null => {
    if (!rows.length) return 'The file has no data rows.';
    const headers = Object.keys(rows[0]);
    const required = ['SKU', 'Product Name', 'Category', 'Price'];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length) return `Missing required column(s): ${missing.join(', ')}`;
    return null;
}
// } validateHeaders

export interface IImportRowResult {
    row: number;
    data: any;
    errors: string[];
}

// validates one row against everything that can be checked WITHOUT hitting the
// database (existence checks for Category/Subcategory/duplicate SKU, and attribute
// resolution, are done by the caller which has the DB lookups already loaded) {
export const validateRowShape = (row: any, rowNumber: number): IImportRowResult => {
    const errors: string[] = [];

    const sku = getStr(row['SKU']);
    const name = getStr(row['Product Name']);
    const category = getStr(row['Category']);
    const price = row['Price'];
    const status = getStr(row['Status']).toUpperCase() || 'DRAFT';
    const productType = getStr(row['Product Type']).toUpperCase() || 'SIMPLE';
    const productGroup = getStr(row['Product Group']) || sku;

    if (empty(sku)) errors.push('SKU is required.');
    if (empty(name)) errors.push('Product Name is required.');
    if (empty(category)) errors.push('Category is required.');
    if (empty(price) || isNaN(Number(price)) || Number(price) < 0) errors.push('Invalid price.');
    if (!VALID_STATUSES.includes(status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
    if (!VALID_PRODUCT_TYPES.includes(productType)) errors.push(`Product Type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}.`);
    if (!empty(row['Image URL']) && !/^https?:\/\//i.test(getStr(row['Image URL']))) errors.push('Image URL must start with http:// or https://');

    return {
        row: rowNumber,
        data: {
            sku,
            name,
            category,
            subcategory: getStr(row['Subcategory']),
            brand: getStr(row['Brand']),
            description: getStr(row['Description']),
            price: Number(price) || 0,
            salePrice: !empty(row['Sale Price']) && !isNaN(Number(row['Sale Price'])) ? Number(row['Sale Price']) : null,
            stock: getNum(row['Stock'], 0),
            lowStockThreshold: getNum(row['Low Stock Threshold'], 0),
            status,
            productType,
            productGroup,
            imageUrl: getStr(row['Image URL']),
            raw: row, // kept only until resolveRowAttributes runs against it - stripped before staging into the session
        },
        errors,
    };
}

// matches every resolved attribute for this row's category/subcategory against its
// own spreadsheet column (by attribute name), typing/validating the raw cell value the
// same way the Product admin form itself would (see product/form.ejs's per-inputType
// handling, mirrored here so the shapes line up: SELECT/COLOR -> attributeValueId,
// MULTI_SELECT -> one row per selected value, BOOLEAN -> textValue 'true'/'false',
// NUMBER/MEASUREMENT -> numericValue, TEXT/DATE -> textValue) {
export const resolveRowAttributes = (resolvedAttributes: any[], rawRow: any): { attributeRows: any[]; errors: string[] } => {
    const attributeRows: any[] = [];
    const errors: string[] = [];

    (resolvedAttributes || []).forEach((attr: any) => {
        const raw = rawRow ? rawRow[attr.name] : undefined;
        if (empty(raw) && raw !== 0) {
            if (attr.isRequired) errors.push(`"${attr.name}" is required.`);
            return;
        }

        if (attr.inputType === 'SELECT' || attr.inputType === 'COLOR') {
            const match = (attr.allowedValues || []).find((v: any) => getStr(v.value).toLowerCase() === getStr(raw).trim().toLowerCase());
            if (!match) { errors.push(`"${attr.name}": "${raw}" is not a valid option.`); return; }
            attributeRows.push({ attributeId: attr.attributeId, attributeValueId: match.id, textValue: null, numericValue: null, unit: null, customValue: null, isVariationAttribute: !!attr.isVariationAttribute });

        } else if (attr.inputType === 'MULTI_SELECT') {
            getStr(raw).split(',').map((s: string) => s.trim()).filter(Boolean).forEach((part: string) => {
                const match = (attr.allowedValues || []).find((v: any) => getStr(v.value).toLowerCase() === part.toLowerCase());
                if (!match) { errors.push(`"${attr.name}": "${part}" is not a valid option.`); return; }
                attributeRows.push({ attributeId: attr.attributeId, attributeValueId: match.id, textValue: null, numericValue: null, unit: null, customValue: null, isVariationAttribute: !!attr.isVariationAttribute });
            });

        } else if (attr.inputType === 'BOOLEAN') {
            const v = getStr(raw).trim().toLowerCase();
            const boolVal = ['yes', 'true', '1'].includes(v) ? 'true' : (['no', 'false', '0'].includes(v) ? 'false' : null);
            if (boolVal === null) { errors.push(`"${attr.name}" must be Yes or No.`); return; }
            attributeRows.push({ attributeId: attr.attributeId, attributeValueId: null, textValue: boolVal, numericValue: null, unit: null, customValue: null, isVariationAttribute: false });

        } else if (attr.inputType === 'NUMBER' || attr.inputType === 'MEASUREMENT') {
            if (isNaN(Number(raw))) { errors.push(`"${attr.name}" must be a number.`); return; }
            attributeRows.push({ attributeId: attr.attributeId, attributeValueId: null, textValue: null, numericValue: Number(raw), unit: attr.unit || null, customValue: null, isVariationAttribute: false });

        } else { // TEXT, DATE
            attributeRows.push({ attributeId: attr.attributeId, attributeValueId: null, textValue: getStr(raw), numericValue: null, unit: null, customValue: null, isVariationAttribute: false });
        }
    });

    return { attributeRows, errors };
}
// } resolveRowAttributes

// splits one row's resolved attribute values into product-level (attributes[]) vs
// variation-level (a variation's attributeValues[]), and strips the transient
// isVariationAttribute marker so the result matches Product's schema shape exactly {
export const splitAttributeRows = (attributeRows: any[]): { productLevel: any[]; variationLevel: any[] } => {
    const productLevel: any[] = [];
    const variationLevel: any[] = [];

    (attributeRows || []).forEach((a: any) => {
        const clean = { attributeId: a.attributeId, attributeValueId: a.attributeValueId, textValue: a.textValue, numericValue: a.numericValue, unit: a.unit, customValue: a.customValue, isProductLevelAddition: false };
        if (a.isVariationAttribute) variationLevel.push(clean);
        else productLevel.push(clean);
    });

    return { productLevel, variationLevel };
}
// } splitAttributeRows

export const slugify = (name: string): string => formatKey(`${name}-${Date.now()}`, '-', false) || '';
