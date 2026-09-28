import { Document, Schema } from 'mongoose';

//--------------------------------------------------------------

export interface ITransactionHistory extends Document {
    userId: Schema.Types.ObjectId;
    wallet: number | null;
    message: string | null;
    data: any | null;
    processStatus: string | null;
    status: string | null;
    deletedAt: Date | null;
}
