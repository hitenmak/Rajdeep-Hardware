import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface ILoginAudit extends Document {
    userId: Schema.Types.ObjectId | null;

    email: string | null;
    status: string | null; // SUCCESS, FAILED
    reason: string | null;

    ipAddress: string | null;
    userAgent: string | null;

    createdAt: Date;
}
