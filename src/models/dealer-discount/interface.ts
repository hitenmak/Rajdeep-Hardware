import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

// A dealer-specific discount percentage scoped to one category - second priority
// in the dealer pricing chain, below a per-product DealerPricing override and
// above the dealer's own flat defaultDiscount.
export interface IDealerDiscount extends Document {
    dealerId: Schema.Types.ObjectId | null;
    categoryId: Schema.Types.ObjectId | null;
    discountPercent: number | null;

    effectiveFrom: Date | null;
    effectiveTo: Date | null;
    status: string | null; // ACTIVE, INACTIVE

    createdAt: Date;
    updatedAt: Date;
}
