import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IPurchaseOrderStatusHistory } from './interface';

//--------------------------------------------------------------

const schema: Schema<IPurchaseOrderStatusHistory> = new Schema({
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'purchaseOrders', default: null },
    oldStatus: { type: String, default: null },
    newStatus: { type: String, default: null },
    remarks: { type: String, default: null },
    changedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.plugin(mongoosePagination);
export default model<IPurchaseOrderStatusHistory>('purchaseOrderStatusHistories', schema, 'purchaseOrderStatusHistories') as any;
