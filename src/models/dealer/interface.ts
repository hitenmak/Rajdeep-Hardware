import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IDealerAuth {
    password: {
        hash: string | null;
        salt: string | null;
    };
    passwordChangedAt: Date | null;

    otp: {
        hash: string | null; // sha256 of the OTP, never stored in plain text
        expireAt: Date | null;
        sentAt: Date | null;
        attempts: number;
    };
    resetNonceHash: string | null; // single-use guard for the password-reset token

    failedLoginAttempts: number;
    lockUntil: Date | null;
    lastLoginAt: Date | null;
}

export interface IDealer extends Document {
    dealerCode: string | null;
    businessName: string | null;
    contactName: string | null;
    email: string | null;
    phoneCode: string | null;
    phone: string | null;

    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;

    taxNumber: string | null;
    status: string | null; // ACTIVE, INACTIVE

    approvalStatus: string | null; // PENDING, APPROVED, REJECTED, SUSPENDED
    approvalRemark: string | null;
    approvedBy: Schema.Types.ObjectId | null;
    approvedAt: Date | null;

    defaultDiscount: number | null; // percent, last-resort fallback in the pricing priority chain

    auth: IDealerAuth; // select: false
    recentSearches: { term: string, searchedAt: Date }[];

    profileImage: string | null;
    isProfileImageLocalStorage: boolean | null;
    preferences: {
        pushNotifications: boolean;
        emailNotifications: boolean;
        smsAlerts: boolean;
        language: string;
    };

    createdBy: Schema.Types.ObjectId | null;
    updatedBy: Schema.Types.ObjectId | null;

    deletedAt: Date | null;
}
