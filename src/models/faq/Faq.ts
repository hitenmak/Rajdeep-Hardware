import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IFaq } from './interface';

//--------------------------------------------------------------

const schema: Schema<IFaq> = new Schema({
    question: { type: String, default: null },
    answer: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, default: 'ACTIVE' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IFaq>('faqs', schema, 'faqs') as any;
