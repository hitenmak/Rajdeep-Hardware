import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IPurchaseOrderAssignment } from './interface';

//--------------------------------------------------------------

const schema: Schema<IPurchaseOrderAssignment> = new Schema({
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'purchaseOrders', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    assignmentType: { type: String, default: null },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    assignedAt: { type: Date, default: Date.now },
    unassignedAt: { type: Date, default: null },
    status: { type: String, default: 'ACTIVE' },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.plugin(mongoosePagination);
export default model<IPurchaseOrderAssignment>('purchaseOrderAssignments', schema, 'purchaseOrderAssignments') as any;
