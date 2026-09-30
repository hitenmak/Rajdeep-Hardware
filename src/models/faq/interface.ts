import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IFaq extends Document {
    question: string | null;
    answer: string | null; // plain text; line breaks are kept
    sortOrder: number;
    status: string | null; // ACTIVE, INACTIVE

    createdBy: Schema.Types.ObjectId | null;
    updatedBy: Schema.Types.ObjectId | null;

    deletedAt: Date | null;
}
