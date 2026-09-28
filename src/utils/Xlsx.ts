import * as XLSX from 'xlsx';

//--------------------------------------------------------------

export const parseWorkbook = (buffer: Buffer): any[] => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export const buildWorkbookBuffer = (rows: any[], sheetName: string = 'Sheet1'): Buffer => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
