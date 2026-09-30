import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { ISetting } from './interface';

//--------------------------------------------------------------

const androidVersionListSchema = new Schema({
    version: { type: String, default: null },
}, { _id: false });

const iosVersionListSchema = new Schema({
    version: { type: String, default: null },
}, { _id: false });

const schema: Schema<ISetting> = new Schema({
    branding: {
        logoFull: { type: String, default: null },
        logoMark: { type: String, default: null },
    },

    general: {
        companyName: { type: String, default: 'Rajdeep Hardware' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        currency: { type: String, default: 'INR' },
    },

    pricing: {
        brassRate: { type: Number, default: null },
        aluminiumRate: { type: Number, default: null },
        pricingFormula: { type: String, default: 'Price = (Rate per kg x Weight) x (1 + Margin%) x (1 + Tax%)' },
        defaultMargin: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
    },

    inventory: {
        defaultLowStockThreshold: { type: Number, default: 5 },
        inventoryAdjustmentRules: { type: String, default: null },
    },

    purchaseOrder: {
        poPrefix: { type: String, default: 'PO' },
        poNumberFormat: { type: String, default: '{PREFIX}-{SEQUENCE:6}' },
        approvalRules: { type: String, default: null },
        requiredRemarks: { type: Boolean, default: false },
    },

    email: {
        smtpHost: { type: String, default: null },
        smtpPort: { type: Number, default: null },
        smtpUsername: { type: String, default: null },
        fromEmail: { type: String, default: null },
    },

    application: {
        paginationLimit: { type: Number, default: 20 },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        fileSizeLimitMb: { type: Number, default: 10 },
        allowedImageTypes: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp'] },
    },

    contactDetails: {
        email: { type: String, default: null },
        phoneCode: { type: String, default: null },
        phone: { type: String, default: null },
        website: { type: String, default: null },
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
    },

    // shown on the dealer PO PDF and the app's Help & Support screen
    bankDetails: {
        bankName: { type: String, default: null },
        accountName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        ifscCode: { type: String, default: null },
        branch: { type: String, default: null },
        upiId: { type: String, default: null },
    },

    legal: {
        termsAndConditions: { type: String, default: null }, // full T&C page in the dealer app
        purchaseOrderTerms: { type: String, default: null }, // short terms printed on every PO PDF
        updatedAt: { type: Date, default: null },
    },

    appDetails: {
        androidApp: {
            apkUrl: { type: String, default: null },
            appLink: { type: String, default: null },
            releaseNote: { type: String, default: null },
            latestVersion: { type: String, default: null },
            isSkippable: { type: Boolean, default: false },
            versionList: [androidVersionListSchema],
        },
        iosApp: {
            apkUrl: { type: String, default: null },
            appLink: { type: String, default: null },
            releaseNote: { type: String, default: null },
            latestVersion: { type: String, default: null },
            isSkippable: { type: Boolean, default: false },
            versionList: [iosVersionListSchema],
        }
    },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<ISetting>('settings', schema, 'settings') as any;