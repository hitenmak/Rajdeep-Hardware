import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IDealerSession } from './interface';

//--------------------------------------------------------------

const schema: Schema<IDealerSession> = new Schema({
    dealerId: { type: Schema.Types.ObjectId, ref: 'dealers', required: true, index: true },

    refreshTokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    rememberMe: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },

    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },

    fcmToken: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
}, { timestamps: true });

// MongoDB purges sessions once they expire
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

schema.plugin(mongoosePagination);
export default model<IDealerSession>('dealerSessions', schema, 'dealerSessions') as any;
