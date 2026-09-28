import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { ITransactionHistory } from './interface';

//--------------------------------------------------------------

const schema: Schema<ITransactionHistory> = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    wallet: { type: Number, default: 0 },
    message: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },
    processStatus: { type: String, default: null },
    status: { type: String, default: null },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<ITransactionHistory>('transactionHistories', schema, 'transactionHistories') as any;