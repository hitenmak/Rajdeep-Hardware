import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IPurchaseOrderAssignment extends Document {
    purchaseOrderId: Schema.Types.ObjectId | null;
    userId: Schema.Types.ObjectId | null;
    assignmentType: string | null; // PACKAGE_MANAGER, DELIVERY_MANAGER
    assignedBy: Schema.Types.ObjectId | null;
    assignedAt: Date | null;
    unassignedAt: Date | null;
    status: string | null; // ACTIVE, INACTIVE

    createdAt: Date;
}
