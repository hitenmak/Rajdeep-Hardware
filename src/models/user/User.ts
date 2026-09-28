import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IUser } from './interface';

//--------------------------------------------------------------

const schema: Schema<IUser> = new Schema({
    createdBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    rolePermissionId: { type: Schema.Types.ObjectId, ref: 'rolePermissions', default: null },

    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    email: { type: String, default: null },
    isEmailVerified: { type: Boolean, default: false },
    phoneCode: { type: String, default: null },
    phone: { type: String, default: null },
    isProfileImageLocalStorage: { type: Boolean, default: true },
    profileImage: { type: String, default: null },

    location: {
        address1: { type: String, default: null },
        address2: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        country: { type: String, default: null },
        postcode: { type: String, default: null },

        latitude: { type: String, default: null },
        longitude: { type: String, default: null },
    },

    bank: {
        code: { type: String, default: null },
        slug: { type: String, default: null },
        country: { type: String, default: null },
        currency: { type: String, default: null },
        type: { type: String, default: null },
        name: { type: String, default: null },
        accountName: { type: String, default: null },
        accountNumber: { type: String, default: null },
    },
    earning: {
        hold: { type: Number, default: 0 },
        wallet: { type: Number, default: 0 },
    },

    password: {
        hash: { type: String, default: null },
        salt: { type: String, default: null },
        token: { type: String, default: null },
    },

    otp: {
        code: { type: Number, default: null },
        expireAt: { type: Date, default: null },
    },
    mfaEmail: {
        otp: { type: Number, default: false },
        expireAt: { type: Date, default: null },
        isActive: { type: Boolean, default: null },
        activeAt: { type: Date, default: null },
    },
    mfa2fa: {
        secret: {
            ascii: { type: String, default: null },
            base32: { type: String, default: null },
        },
        unverifiedSecret: {
            ascii: { type: String, default: null },
            base32: { type: String, default: null },
        },
        verifyAppName: { type: String, default: null },
        isActive: { type: Boolean, default: false },
        activeAt: { type: Date, default: null },
    },

    fcmToken: { type: String, default: null },
    basicToken: { type: String, default: null },

    isTermsAndConditions: { type: Boolean, default: true },
    isLoggedIn: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    status: { type: String, default: 'REVIEW' },
    reason: { type: String, default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IUser>('users', schema, 'users') as any;