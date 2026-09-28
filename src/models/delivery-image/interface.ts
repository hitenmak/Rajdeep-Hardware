import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IDeliveryImage extends Document {
    purchaseOrderId: Schema.Types.ObjectId | null;
    uploadedBy: Schema.Types.ObjectId | null;
    image: string | null; // stored media key, resolved to a URL via MediaManager
    remarks: string | null;

    createdAt: Date;
}
