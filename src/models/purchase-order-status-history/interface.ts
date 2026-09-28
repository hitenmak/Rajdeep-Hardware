import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IPurchaseOrderStatusHistory extends Document {
    purchaseOrderId: Schema.Types.ObjectId | null;
    oldStatus: string | null;
    newStatus: string | null;
    remarks: string | null;
    changedBy: Schema.Types.ObjectId | null;

    createdAt: Date;
}
