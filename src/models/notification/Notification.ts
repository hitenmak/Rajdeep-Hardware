import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { INotification } from './interface';

//--------------------------------------------------------------

const schema: Schema<INotification> = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    dealerId: { type: Schema.Types.ObjectId, ref: 'dealers', default: null, index: true },
    actionBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    type: { type: String, default: null },
    title: { type: String, default: null },
    description: { type: String, default: null },
    navigateTo: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },

    action: { type: String, default: null },
    isRead: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<INotification>('notifications', schema, 'notifications') as any;