import { Document, Schema } from 'mongoose';

//--------------------------------------------------------------

interface IAndroidVersionListSchema {
    version: string | null;
}

interface IIosVersionListSchema {
    version: string | null;
}

export interface ISetting extends Document {
    branding: {
        logoFull: string | null;
        logoMark: string | null;
    };

    general: {
        companyName: string | null;
        timezone: string | null;
        currency: string | null;
    };

    pricing: {
        brassRate: number | null; // per kg
        aluminiumRate: number | null; // per kg
        pricingFormula: string | null; // reference/description only - the engine always applies (rate * weight) * (1 + margin%) * (1 + tax%)
        defaultMargin: number | null; // percent
        tax: number | null; // percent
    };

    inventory: {
        defaultLowStockThreshold: number | null;
        inventoryAdjustmentRules: string | null;
    };

    purchaseOrder: {
        poPrefix: string | null;
        poNumberFormat: string | null; // e.g. "{PREFIX}-{SEQUENCE:6}" - {SEQUENCE:N} pads the running number to N digits
        approvalRules: string | null;
        requiredRemarks: boolean | null;
    };

    email: {
        smtpHost: string | null;
        smtpPort: number | null;
        smtpUsername: string | null;
        fromEmail: string | null;
    };

    application: {
        paginationLimit: number | null;
        dateFormat: string | null;
        fileSizeLimitMb: number | null;
        allowedImageTypes: string[];
    };

    contactDetails: {
        email: string | null;
        phoneCode: string | null;
        phone: string | null;
        website: string | null;
        location: {
            address1: string | null;
            address2: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            postcode: string | null;

            latitude: string | null;
            longitude: string | null;
        }
    };

    appDetails: {
        androidApp: {
            apkUrl: string | null;
            appLink: string | null;
            releaseNote: string | null;
            latestVersion: string | null;
            isSkippable: boolean | null;
            versionList: IAndroidVersionListSchema[];
        };
        iosApp: {
            apkUrl: string | null;
            appLink: string | null;
            releaseNote: string | null;
            latestVersion: string | null;
            isSkippable: boolean | null;
            versionList: IIosVersionListSchema[];
        };
    };
}
