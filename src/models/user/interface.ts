import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IUser extends Document {
    createdBy: Schema.Types.ObjectId;
    rolePermissionId: Schema.Types.ObjectId;

    firstName: string | null;
    lastName: string | null;
    email: string | null;
    isEmailVerified: boolean | null;
    phoneCode: string | null;
    phone: string | null;
    isProfileImageLocalStorage: boolean | null;
    profileImage: string | null;

    location: {
        address1: string | null;
        address2: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postcode: string | null;

        latitude: string | null;
        longitude: string | null;
    };

    bank: {
        code: string | null,
        slug: string | null,
        country: string | null,
        currency: string | null,
        type: string | null,
        name: string | null,
        accountName: string | null,
        accountNumber: string | null,
    };
    earning: {
        hold: number | null;
        wallet: number | null;
    };

    password: {
        hash: string | null;
        salt: string | null;
        token: string | null;
    };

    otp: {
        code: number | null;
        expireAt: Date | null;
    };
    mfaEmail: {
        otp: number | null,
        expireAt: Date | null,
        isActive: boolean | null,
        activeAt: Date | null
    },
    mfa2fa: {
        secret: {
            ascii: string | null;
            base32: string | null;
        },
        unverifiedSecret: {
            ascii: string | null;
            base32: string | null;
        },
        verifyAppName: string | null;
        isActive: boolean | null;
        activeAt: Date | null;
    };

    fcmToken: string | null;
    basicToken: string | null;

    isTermsAndConditions: boolean | null;
    isLoggedIn: boolean | null;
    isActive: boolean | null;

    lastLoginAt: Date | null;
    failedLoginAttempts: number | null;
    lockUntil: Date | null;

    status: string | null;
    reason: string | null;

    deletedAt: Date | null;
}
