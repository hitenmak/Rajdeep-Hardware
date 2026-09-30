import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IDealer } from './interface';

//--------------------------------------------------------------

// Credentials live in their own sub-document with select:false so existing panel/admin
// queries on dealers never load password or OTP hashes. Load explicitly with .select('+auth').
const authSchema: Schema = new Schema({
    password: {
        hash: { type: String, default: null },
        salt: { type: String, default: null },
    },
    passwordChangedAt: { type: Date, default: null },

    otp: {
        hash: { type: String, default: null },
        expireAt: { type: Date, default: null },
        sentAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
    },
    resetNonceHash: { type: String, default: null },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
}, { _id: false });

const schema: Schema<IDealer> = new Schema({
    dealerCode: { type: String, default: null },
    businessName: { type: String, default: null },
    contactName: { type: String, default: null },
    email: { type: String, default: null },
    phoneCode: { type: String, default: null },
    phone: { type: String, default: null },

    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },

    taxNumber: { type: String, default: null },
    status: { type: String, default: 'ACTIVE' },

    approvalStatus: { type: String, default: 'PENDING' },
    approvalRemark: { type: String, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    approvedAt: { type: Date, default: null },

    defaultDiscount: { type: Number, default: 0 },

    auth: { type: authSchema, default: () => ({}), select: false },

    profileImage: { type: String, default: null },
    isProfileImageLocalStorage: { type: Boolean, default: true },

    preferences: {
        pushNotifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        smsAlerts: { type: Boolean, default: false },
        language: { type: String, default: 'en' },
    },

    // newest first, capped by the dealer catalogue search API
    recentSearches: {
        type: [new Schema({ term: { type: String, default: null }, searchedAt: { type: Date, default: null } }, { _id: false })],
        default: [],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IDealer>('dealers', schema, 'dealers') as any;
