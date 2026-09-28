import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

// A dealer-specific price override for one product - highest priority in the
// dealer pricing chain (Dealer Product Price > Dealer Category Discount > Dealer
// Default Discount > Standard Product Price).
export interface IDealerPricing extends Document {
    dealerId: Schema.Types.ObjectId | null;
    productId: Schema.Types.ObjectId | null;
    price: number | null;

    effectiveFrom: Date | null;
    effectiveTo: Date | null;
    status: string | null; // ACTIVE, INACTIVE

    createdAt: Date;
    updatedAt: Date;
}
