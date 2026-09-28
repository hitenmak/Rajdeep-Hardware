import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface INotification extends Document {
    userId: Schema.Types.ObjectId;
    actionBy: Schema.Types.ObjectId;

    type: string | null;
    title: string | null;
    description: string | null;
    navigateTo: string | null;
    data: any | null;

    action: string | null;
    isRead: boolean | null;
    deletedAt: Date | null;
}
