import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IActivityLogChange {
    field: string;
    label: string;
    oldValue: any;
    newValue: any;
}

export interface IActivityLog extends Document {
    module: string | null; // PRODUCT, DEALER, PURCHASE-ORDER, CATEGORY, SETTING
    entityId: Schema.Types.ObjectId | null; // null only for Settings (a singleton)
    entityLabel: string | null; // snapshot display name at the time of the action

    action: string | null; // CREATE, UPDATE, DELETE, STATUS_CHANGE, BULK_PRICE_ADJUSTMENT
    changes: IActivityLogChange[];
    summary: string | null;

    performedBy: Schema.Types.ObjectId | null;
    performedByName: string | null; // snapshot - stays correct even if the user is later renamed/deleted
    performedByRole: string | null; // snapshot of the role name at the time

    ipAddress: string | null;
    userAgent: string | null;

    createdAt: Date;
}
