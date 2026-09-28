import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface ICronJob extends Document {
    actionBy: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;

    cronType: string | null;
    isAdminMail: boolean | null;
    type: string | null;

    title: string | null;
    navigateTo: string | null;
    description: string | null;
    data: any | null;

    isSended: boolean | null;
    deletedAt: Date | null;
}
