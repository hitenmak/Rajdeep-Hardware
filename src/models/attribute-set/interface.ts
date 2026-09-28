import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IAttributeSetItem {
    attributeId: Schema.Types.ObjectId;
    isRequired: boolean | null;
    isVariationAttribute: boolean | null;
    allowedValueIds: Schema.Types.ObjectId[]; // empty = all active values of the attribute are allowed
    sortOrder: number | null;
}

export interface IAttributeSet extends Document {
    name: string | null;
    code: string | null;
    description: string | null;
    status: string | null;
    sortOrder: number | null;

    items: IAttributeSetItem[];

    deletedAt: Date | null;
}
