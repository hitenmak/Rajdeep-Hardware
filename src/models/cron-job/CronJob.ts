import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { ICronJob } from './interface';

//--------------------------------------------------------------

const schema: Schema<ICronJob> = new Schema({
    actionBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    cronType: { type: String, default: null }, // MAIL, NOTIFICATION
    isAdminMail: { type: Boolean, default: false },
    type: { type: String, default: null },
    title: { type: String, default: null },
    navigateTo: { type: String, default: null },
    description: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },

    isSended: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<ICronJob>('cronJobs', schema, 'cronJobs') as any;