import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { ILoginAudit } from './interface';

//--------------------------------------------------------------

const schema: Schema<ILoginAudit> = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    email: { type: String, default: null },
    status: { type: String, default: null },
    reason: { type: String, default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.plugin(mongoosePagination);
export default model<ILoginAudit>('loginAudits', schema, 'loginAudits') as any;
