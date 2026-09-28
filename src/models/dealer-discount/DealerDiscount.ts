import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IDealerDiscount } from './interface';

//--------------------------------------------------------------

const schema: Schema<IDealerDiscount> = new Schema({
    dealerId: { type: Schema.Types.ObjectId, ref: 'dealers', default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'categories', default: null },
    discountPercent: { type: Number, default: 0 },

    effectiveFrom: { type: Date, default: null },
    effectiveTo: { type: Date, default: null },
    status: { type: String, default: 'ACTIVE' },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IDealerDiscount>('dealerDiscounts', schema, 'dealerDiscounts') as any;
