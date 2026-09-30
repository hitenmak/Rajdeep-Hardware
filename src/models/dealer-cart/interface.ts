import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IDealerCartItem {
    _id: Schema.Types.ObjectId;
    productId: Schema.Types.ObjectId;
    variationId: Schema.Types.ObjectId | null;
    quantity: number;
    addedAt: Date;
}

// Holds only what the dealer picked - prices and stock are always re-resolved live.
export interface IDealerCart extends Document {
    dealerId: Schema.Types.ObjectId;
    items: IDealerCartItem[];
    checkoutLockedAt: Date | null; // guards against a double-submitted checkout
}
