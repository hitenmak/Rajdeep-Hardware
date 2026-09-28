import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IActivityLog } from './interface';

//--------------------------------------------------------------

const changeSchema = new Schema({
    field: { type: String, default: null },
    label: { type: String, default: null },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const schema: Schema<IActivityLog> = new Schema({
    module: { type: String, default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    entityLabel: { type: String, default: null },

    action: { type: String, default: null },
    changes: { type: [changeSchema], default: [] },
    summary: { type: String, default: null },

    performedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    performedByName: { type: String, default: null },
    performedByRole: { type: String, default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.plugin(mongoosePagination);
export default model<IActivityLog>('activityLogs', schema, 'activityLogs') as any;
