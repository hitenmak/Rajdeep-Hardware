import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IDeliveryImage } from './interface';

//--------------------------------------------------------------

const schema: Schema<IDeliveryImage> = new Schema({
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'purchaseOrders', default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    image: { type: String, default: null },
    remarks: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.plugin(mongoosePagination);
export default model<IDeliveryImage>('deliveryImages', schema, 'deliveryImages') as any;
