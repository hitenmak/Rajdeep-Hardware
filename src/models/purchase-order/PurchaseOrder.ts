import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IPurchaseOrder } from './interface';

//--------------------------------------------------------------

const itemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'products', default: null },
    sku: { type: String, default: null },
    productName: { type: String, default: null },

    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    approvedQuantity: { type: Number, default: null },
    rejectedQuantity: { type: Number, default: null },
    remarks: { type: String, default: null },
}, { _id: true });

const schema: Schema<IPurchaseOrder> = new Schema({
    poNumber: { type: String, default: null },
    dealerId: { type: Schema.Types.ObjectId, ref: 'dealers', default: null },
    orderDate: { type: Date, default: Date.now },

    items: { type: [itemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    remarks: { type: String, default: null },
    status: { type: String, default: 'PENDING' },

    assignedPackageManagerId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    assignedDeliveryManagerId: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IPurchaseOrder>('purchaseOrders', schema, 'purchaseOrders') as any;
