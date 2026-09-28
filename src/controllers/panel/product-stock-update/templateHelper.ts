import ExcelJS from 'exceljs';

// Others
import { VALID_STATUSES, FULL_TEMPLATE_BASE_COLUMNS, combinationLabel, formatAttributeValueForExport, formatVariationAttributeValueForExport } from './helper';

//--------------------------------------------------------------
/*
    Builds the "Full Details Update" workbook: every product/variation in the chosen
    category, pre-filled with its CURRENT Name/Brand/Description/Status/Price/Stock/
    Image/attribute values (unlike the create-time sample template in
    product-import-export, which starts blank) - so the admin edits only what they
    actually want to change and re-uploads the same file. SKU is the match key and
    should not be edited; everything else is optional per row (blank = unchanged).
*/

const excelColumnLetter = (index: number): string => {
    let letter = '';
    let n = index + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}

export const buildFullUpdateTemplate = async (options: {
    categoryName: string;
    attributes: any[]; // Core.Attribute.resolve()'s IResolvedAttribute[]
    products: any[]; // lean Product docs, already scoped to this category
    imageUrlOf: (image: string | null) => string;
}): Promise<ExcelJS.Buffer> => {
    const { categoryName, attributes, products, imageUrlOf } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rajdeep Hardware Admin';
    workbook.created = new Date();

    // ---------- Instructions ----------
    const introSheet = workbook.addWorksheet('Instructions');
    introSheet.columns = [{ width: 100 }];
    const introLines = [
        'How to use this template',
        '',
        `Every product in "${categoryName}" is listed on the "Products" sheet, one row per SKU (a Simple product's own SKU, or one row per Variable product's variation SKU), pre-filled with its current details.`,
        '',
        'Change only the cells you actually want to update, then upload this same file back on the Stock & Price Update page. A blank cell always means "leave this unchanged" - it will NOT clear the existing value.',
        '',
        'Do not edit the SKU column - it is how each row is matched back to the correct product/variation. Type and Variation are reference-only.',
        '',
        'To replace a product\'s image, paste a new public http(s) image link in the Image URL column - it will be downloaded and set as that row\'s image. Leave it as-is to keep the current image.',
    ];
    introLines.forEach((line, i) => {
        const cell = introSheet.getCell(`A${i + 1}`);
        cell.value = line;
        if (i === 0) cell.font = { bold: true, size: 14 };
        cell.alignment = { wrapText: true, vertical: 'top' };
    });

    // ---------- Lookup (hidden) ----------
    const lookupSheet = workbook.addWorksheet('Lookup', { state: 'veryHidden' });
    const lookupColumns: { header: string; values: string[] }[] = [
        { header: 'Status', values: VALID_STATUSES },
        { header: 'Yes/No', values: ['Yes', 'No'] },
    ];
    const selectableAttributes = attributes.filter((a: any) => ['SELECT', 'COLOR'].includes(a.inputType) && a.allowedValues?.length);
    selectableAttributes.forEach((a: any) => lookupColumns.push({ header: a.name, values: a.allowedValues.map((v: any) => v.value) }));

    const lookupRanges: Record<string, string> = {};
    lookupColumns.forEach((col, colIndex) => {
        const colLetter = excelColumnLetter(colIndex);
        lookupSheet.getCell(`${colLetter}1`).value = col.header;
        col.values.forEach((v, i) => { lookupSheet.getCell(`${colLetter}${i + 2}`).value = v; });
        if (col.values.length) lookupRanges[col.header] = `Lookup!$${colLetter}$2:$${colLetter}$${col.values.length + 1}`;
    });

    // ---------- Products ----------
    const sheet = workbook.addWorksheet('Products');
    const columns = [...FULL_TEMPLATE_BASE_COLUMNS.map((h) => ({ header: h })), ...attributes.map((a: any) => ({ header: a.name }))];
    sheet.columns = columns.map((c) => ({ header: c.header, width: Math.max(16, c.header.length + 4) }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }; });

    const referenceOnly = new Set(['SKU', 'Type', 'Variation']);
    columns.forEach((c: any, i) => {
        const cell = sheet.getCell(2, i + 1);
        cell.value = referenceOnly.has(c.header) ? 'Reference Only' : 'Editable';
        cell.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
    });
    sheet.getCell(1, columns.findIndex((c: any) => c.header === 'SKU') + 1).note = 'Do not edit - this is the match key.';

    const LAST_ROW = products.reduce((n: number, p: any) => n + (p.productType === 'VARIABLE' ? Math.max(1, (p.variations || []).length) : 1), 0) + 3;
    const applyListValidation = (colIndex: number, range: string) => {
        for (let r = 3; r <= LAST_ROW; r++) {
            sheet.getCell(r, colIndex + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [range], showErrorMessage: true, errorTitle: 'Invalid value', error: 'Please choose a value from the dropdown list.' };
        }
    }
    columns.forEach((c: any, i) => { if (c.header === 'Status') applyListValidation(i, lookupRanges['Status']); });
    attributes.forEach((a: any, i) => {
        const colIndex = FULL_TEMPLATE_BASE_COLUMNS.length + i;
        if (a.inputType === 'BOOLEAN') applyListValidation(colIndex, lookupRanges['Yes/No']);
        else if (['SELECT', 'COLOR'].includes(a.inputType) && lookupRanges[a.name]) applyListValidation(colIndex, lookupRanges[a.name]);
    });

    // ---------- rows: current data for every SKU ----------
    let rowNumber = 3;
    const writeAttributeCell = (attr: any, value: string) => {
        const colIndex = FULL_TEMPLATE_BASE_COLUMNS.length + attributes.indexOf(attr);
        sheet.getCell(rowNumber, colIndex + 1).value = value;
    }

    products.forEach((p: any) => {
        const primaryImage = (p.images || []).find((img: any) => img.isPrimary) || (p.images || [])[0];
        const productImageUrl = primaryImage ? imageUrlOf(primaryImage.image) : '';

        if (p.productType === 'VARIABLE' && (p.variations || []).length) {
            p.variations.forEach((v: any) => {
                const base: Record<string, any> = {
                    'SKU': v.sku || '', 'Product Name': p.name || '', 'Type': 'VARIABLE', 'Variation': combinationLabel(v, attributes),
                    'Brand': p.brand || '', 'Description': p.description || '', 'Status': p.status || '',
                    'Price': v.price ?? '', 'Stock': v.stockQuantity ?? 0, 'Low Stock Threshold': v.lowStockThreshold ?? 0,
                    'Image URL': v.image ? imageUrlOf(v.image) : productImageUrl,
                };
                FULL_TEMPLATE_BASE_COLUMNS.forEach((h, i) => { sheet.getCell(rowNumber, i + 1).value = base[h] ?? ''; });
                attributes.forEach((a: any) => writeAttributeCell(a, a.isVariationAttribute ? formatVariationAttributeValueForExport(a, v) : formatAttributeValueForExport(a, p)));
                rowNumber++;
            });
        } else {
            const base: Record<string, any> = {
                'SKU': p.baseSku || '', 'Product Name': p.name || '', 'Type': 'SIMPLE', 'Variation': '',
                'Brand': p.brand || '', 'Description': p.description || '', 'Status': p.status || '',
                'Price': p.pricing?.price ?? '', 'Stock': p.inventory?.globalStock ?? 0, 'Low Stock Threshold': p.inventory?.lowStockThreshold ?? 0,
                'Image URL': productImageUrl,
            };
            FULL_TEMPLATE_BASE_COLUMNS.forEach((h, i) => { sheet.getCell(rowNumber, i + 1).value = base[h] ?? ''; });
            attributes.forEach((a: any) => writeAttributeCell(a, formatAttributeValueForExport(a, p)));
            rowNumber++;
        }
    });

    sheet.getRow(1).eachCell((cell) => cell.border = { bottom: { style: 'thin' } });

    return await workbook.xlsx.writeBuffer();
}
