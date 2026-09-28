import ExcelJS from 'exceljs';

// Others
import { VALID_STATUSES } from './helper';

//--------------------------------------------------------------
/*
    Builds a category-specific "sample template" workbook for bulk product
    import - modeled on the reference Tablets.xlsx: an Instructions sheet, a
    hidden Lookup sheet backing every dropdown, and a Products sheet with a
    header row, a "how to fill this column" hint row, and a few worked
    examples (including a Variable product split across two rows sharing one
    Product Group, so the variation pattern is demonstrated too).
*/

const BASE_COLUMNS = [
    { header: 'Product Group', hint: 'Manual Fill', note: 'Give every row of the SAME product (its Simple row, or all of a Variable product\'s variation rows) the same Product Group value.' },
    { header: 'SKU', hint: 'Manual Fill', note: 'Must be unique. For a Variable product, this is the SKU of that one variation.' },
    { header: 'Product Type', hint: 'Selection List', note: 'SIMPLE = one row. VARIABLE = one row per variation, all sharing the same Product Group.' },
    { header: 'Product Name', hint: 'Manual Fill' },
    { header: 'Category', hint: 'Auto Fill', note: 'Pre-filled for this template - do not change.' },
    { header: 'Subcategory', hint: 'Selection List' },
    { header: 'Brand', hint: 'Manual Fill' },
    { header: 'Description', hint: 'Manual Fill' },
    { header: 'Price', hint: 'Manual Fill', note: 'Simple product price, or this variation\'s price.' },
    { header: 'Sale Price', hint: 'Manual Fill' },
    { header: 'Stock', hint: 'Manual Fill', note: 'Simple product stock, or this variation\'s stock.' },
    { header: 'Low Stock Threshold', hint: 'Manual Fill' },
    { header: 'Status', hint: 'Selection List' },
    { header: 'Image URL', hint: 'Manual Fill', note: 'Optional - a public http(s) link to a JPG/PNG/WEBP image. It will be downloaded and set as this row\'s image on import. Leave blank to add images later from the product\'s edit page.' },
];

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

export const buildCategoryTemplate = async (options: {
    categoryName: string;
    subcategories: { name: string }[];
    attributes: any[]; // Core.Attribute.resolve()'s IResolvedAttribute[]
}): Promise<ExcelJS.Buffer> => {
    const { categoryName, subcategories, attributes } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rajdeep Hardware Admin';
    workbook.created = new Date();

    // ---------- Instructions ----------
    const introSheet = workbook.addWorksheet('Instructions');
    introSheet.columns = [{ width: 100 }];
    const introLines = [
        'How to use this template',
        '',
        `This template is for the "${categoryName}" category. Fill in your products on the "Products" sheet - do not rename or remove any column headers, they are required for a correct import.`,
        '',
        'Row 2 on the Products sheet tells you how to fill each column: "Manual Fill" (type your own value), "Selection List" (pick from the dropdown), or "Auto Fill" (already filled in for you - leave as is).',
        '',
        'Simple product: use one row. Set Product Type to SIMPLE.',
        '',
        'Variable product: use one row per variation (e.g. one row per Color/Size combination). Set Product Type to VARIABLE on every one of those rows, and give them all the same value in the Product Group column so the importer knows they belong together. Each row still needs its own unique SKU, Price and Stock for that specific variation.',
        '',
        `A few example rows are already filled in on the Products sheet to show both patterns - replace or delete them before importing your own data.`,
    ];
    introLines.forEach((line, i) => {
        const cell = introSheet.getCell(`A${i + 1}`);
        cell.value = line;
        if (i === 0) cell.font = { bold: true, size: 14 };
        cell.alignment = { wrapText: true, vertical: 'top' };
    });

    // ---------- Lookup (hidden) - one column per dropdown source ----------
    const lookupSheet = workbook.addWorksheet('Lookup', { state: 'veryHidden' });
    const lookupColumns: { header: string; values: string[] }[] = [
        { header: 'Product Type', values: ['SIMPLE', 'VARIABLE'] },
        { header: 'Status', values: VALID_STATUSES },
        { header: 'Subcategory', values: subcategories.map((s) => s.name) },
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
    const columns = [...BASE_COLUMNS, ...attributes.map((a: any) => ({ header: a.name, hint: ['SELECT', 'COLOR'].includes(a.inputType) ? 'Selection List' : (a.inputType === 'MULTI_SELECT' ? 'Selection List (comma-separated)' : (a.inputType === 'BOOLEAN' ? 'Selection List' : 'Manual Fill')) }))];

    sheet.columns = columns.map((c) => ({ header: c.header, width: Math.max(16, c.header.length + 4) }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }; });

    // hint row (row 2)
    columns.forEach((c: any, i) => {
        const cell = sheet.getCell(2, i + 1);
        cell.value = c.hint || 'Manual Fill';
        cell.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
    });

    // column notes (as real cell comments on the header, matching the reference's per-column guidance)
    columns.forEach((c: any, i) => {
        if (!c.note) return;
        sheet.getCell(1, i + 1).note = c.note;
    });
    attributes.forEach((a: any, i) => {
        const colIndex = BASE_COLUMNS.length + i;
        const parts: string[] = [];
        if (a.unit) parts.push(`Unit: ${a.unit}`);
        if (a.isRequired) parts.push('Required for this category');
        if (a.isVariationAttribute) parts.push('Can be used to define variations (Variable products)');
        if (a.inputType === 'MULTI_SELECT') parts.push('Enter one or more values separated by commas');
        if (parts.length) sheet.getCell(1, colIndex + 1).note = parts.join('. ');
    });

    // data validation (dropdowns) applied down a generous number of rows
    const LAST_ROW = 500;
    const applyListValidation = (colIndex: number, range: string) => {
        for (let r = 3; r <= LAST_ROW; r++) {
            sheet.getCell(r, colIndex + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [range], showErrorMessage: true, errorTitle: 'Invalid value', error: 'Please choose a value from the dropdown list.' };
        }
    }
    columns.forEach((c: any, i) => {
        if (c.header === 'Product Type') applyListValidation(i, lookupRanges['Product Type']);
        else if (c.header === 'Status') applyListValidation(i, lookupRanges['Status']);
        else if (c.header === 'Subcategory' && lookupRanges['Subcategory']) applyListValidation(i, lookupRanges['Subcategory']);
    });
    attributes.forEach((a: any, i) => {
        const colIndex = BASE_COLUMNS.length + i;
        if (a.inputType === 'BOOLEAN') applyListValidation(colIndex, lookupRanges['Yes/No']);
        else if (['SELECT', 'COLOR'].includes(a.inputType) && lookupRanges[a.name]) applyListValidation(colIndex, lookupRanges[a.name]);
        // MULTI_SELECT intentionally left as free text (comma-separated) - a strict
        // single-value Excel list validation can't represent multiple picks cleanly
    });

    // ---------- sample rows ----------
    const variationAttrs = attributes.filter((a: any) => a.isVariationAttribute && a.allowedValues?.length);
    const attrColByName: Record<string, number> = {};
    attributes.forEach((a: any, i) => attrColByName[a.name] = BASE_COLUMNS.length + i + 1);

    const writeRow = (rowNumber: number, base: Record<string, any>, attributeValues: Record<string, any> = {}) => {
        BASE_COLUMNS.forEach((c, i) => { sheet.getCell(rowNumber, i + 1).value = base[c.header] ?? ''; });
        Object.keys(attributeValues).forEach((name) => {
            const col = attrColByName[name];
            if (col) sheet.getCell(rowNumber, col).value = attributeValues[name];
        });
    }

    let nextRow = 3;
    // sample 1: a Simple product, using the first value of every non-variation attribute
    const simpleAttrValues: Record<string, any> = {};
    attributes.forEach((a: any) => {
        if (a.inputType === 'MULTI_SELECT') simpleAttrValues[a.name] = (a.allowedValues || []).slice(0, 2).map((v: any) => v.value).join(', ');
        else if (a.inputType === 'BOOLEAN') simpleAttrValues[a.name] = 'Yes';
        else if (['SELECT', 'COLOR'].includes(a.inputType)) simpleAttrValues[a.name] = a.allowedValues?.[0]?.value || '';
        else simpleAttrValues[a.name] = a.inputType === 'NUMBER' || a.inputType === 'MEASUREMENT' ? 10 : 'Sample value';
    });
    writeRow(nextRow++, {
        'Product Group': 'SAMPLE-SIMPLE-1', 'SKU': 'SAMPLE-SKU-001', 'Product Type': 'SIMPLE', 'Product Name': `Sample ${categoryName} Product`,
        'Category': categoryName, 'Subcategory': subcategories[0]?.name || '', 'Brand': 'Sample Brand', 'Description': 'Replace with a real product description.',
        'Price': 999, 'Sale Price': 899, 'Stock': 25, 'Low Stock Threshold': 5, 'Status': 'DRAFT',
    }, simpleAttrValues);

    // sample 2 & 3: a Variable product with 2 variation rows, if this category actually has
    // variation-eligible attributes - otherwise add one more Simple example instead
    if (variationAttrs.length) {
        const varyAttr = variationAttrs[0];
        const otherValues: Record<string, any> = {};
        attributes.forEach((a: any) => {
            if (a.attributeId === varyAttr.attributeId) return;
            if (a.inputType === 'MULTI_SELECT') otherValues[a.name] = (a.allowedValues || []).slice(0, 2).map((v: any) => v.value).join(', ');
            else if (a.inputType === 'BOOLEAN') otherValues[a.name] = 'Yes';
            else if (['SELECT', 'COLOR'].includes(a.inputType)) otherValues[a.name] = a.allowedValues?.[0]?.value || '';
            else otherValues[a.name] = a.inputType === 'NUMBER' || a.inputType === 'MEASUREMENT' ? 10 : 'Sample value';
        });

        (varyAttr.allowedValues || []).slice(0, 2).forEach((val: any, i: number) => {
            writeRow(nextRow++, {
                'Product Group': 'SAMPLE-VARIABLE-1', 'SKU': `SAMPLE-SKU-VAR-00${i + 1}`, 'Product Type': 'VARIABLE', 'Product Name': `Sample Variable ${categoryName} Product`,
                'Category': categoryName, 'Subcategory': subcategories[0]?.name || '', 'Brand': 'Sample Brand', 'Description': 'Replace with a real product description.',
                'Price': 1200 + i * 100, 'Sale Price': '', 'Stock': 10 + i * 5, 'Low Stock Threshold': 3, 'Status': 'DRAFT',
            }, { ...otherValues, [varyAttr.name]: val.value });
        });
    } else {
        writeRow(nextRow++, {
            'Product Group': 'SAMPLE-SIMPLE-2', 'SKU': 'SAMPLE-SKU-002', 'Product Type': 'SIMPLE', 'Product Name': `Another Sample ${categoryName} Product`,
            'Category': categoryName, 'Subcategory': subcategories[0]?.name || '', 'Brand': 'Sample Brand', 'Description': 'Replace with a real product description.',
            'Price': 499, 'Sale Price': '', 'Stock': 40, 'Low Stock Threshold': 10, 'Status': 'ACTIVE',
        }, simpleAttrValues);
    }

    sheet.getRow(1).eachCell((cell) => cell.border = { bottom: { style: 'thin' } });

    return await workbook.xlsx.writeBuffer();
}
