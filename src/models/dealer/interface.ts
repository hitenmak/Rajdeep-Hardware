import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IDealer extends Document {
    dealerCode: string | null;
    businessName: string | null;
    contactName: string | null;
    email: string | null;
    phoneCode: string | null;
    phone: string | null;

    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;

    taxNumber: string | null;
    status: string | null; // ACTIVE, INACTIVE

    approvalStatus: string | null; // PENDING, APPROVED, REJECTED, SUSPENDED
    approvalRemark: string | null;
    approvedBy: Schema.Types.ObjectId | null;
    approvedAt: Date | null;

    defaultDiscount: number | null; // percent, last-resort fallback in the pricing priority chain

    createdBy: Schema.Types.ObjectId | null;
    updatedBy: Schema.Types.ObjectId | null;

    deletedAt: Date | null;
}
