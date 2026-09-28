import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IDealerPricing } from './interface';

//--------------------------------------------------------------

const schema: Schema<IDealerPricing> = new Schema({
    dealerId: { type: Schema.Types.ObjectId, ref: 'dealers', default: null },
    productId: { type: Schema.Types.ObjectId, ref: 'products', default: null },
    price: { type: Number, default: null },

    effectiveFrom: { type: Date, default: null },
    effectiveTo: { type: Date, default: null },
    status: { type: String, default: 'ACTIVE' },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IDealerPricing>('dealerPricings', schema, 'dealerPricings') as any;
