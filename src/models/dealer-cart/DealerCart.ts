import { Schema, model } from 'mongoose';

// Interfaces
import { IDealerCart } from './interface';

//--------------------------------------------------------------

const itemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'products', required: true },
    variationId: { type: Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now },
});

const schema: Schema<IDealerCart> = new Schema({
    dealerId: { type: Schema.Types.ObjectId, ref: 'dealers', required: true, unique: true },
    items: { type: [itemSchema], default: [] },
    checkoutLockedAt: { type: Date, default: null },
}, { timestamps: true });

export default model<IDealerCart>('dealerCarts', schema, 'dealerCarts') as any;
