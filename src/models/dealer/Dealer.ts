import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IDealer } from './interface';

//--------------------------------------------------------------

const schema: Schema<IDealer> = new Schema({
    dealerCode: { type: String, default: null },
    businessName: { type: String, default: null },
    contactName: { type: String, default: null },
    email: { type: String, default: null },
    phoneCode: { type: String, default: null },
    phone: { type: String, default: null },

    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },

    taxNumber: { type: String, default: null },
    status: { type: String, default: 'ACTIVE' },

    approvalStatus: { type: String, default: 'PENDING' },
    approvalRemark: { type: String, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    approvedAt: { type: Date, default: null },

    defaultDiscount: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IDealer>('dealers', schema, 'dealers') as any;
