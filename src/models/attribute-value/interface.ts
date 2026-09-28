import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IAttributeValue extends Document {
    attributeId: Schema.Types.ObjectId;

    value: string | null;
    code: string | null;
    displayValue: string | null;
    hexCode: string | null;
    image: string | null;
    description: string | null;

    sortOrder: number | null;
    status: string | null;

    deletedAt: Date | null;
}
