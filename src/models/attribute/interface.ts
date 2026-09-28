import { Document } from 'mongoose';

//--------------------------------------------------------------

export interface IAttribute extends Document {
    name: string | null;
    code: string | null;
    inputType: string | null; // SELECT, MULTI_SELECT, TEXT, NUMBER, COLOR, DATE, MEASUREMENT, BOOLEAN
    unit: string | null;

    isVariationAttribute: boolean | null;
    isRequired: boolean | null;
    allowCustomValue: boolean | null;

    status: string | null;
    sortOrder: number | null;

    deletedAt: Date | null;
}
