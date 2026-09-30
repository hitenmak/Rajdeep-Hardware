import { Document } from 'mongoose';

//--------------------------------------------------------------

export interface ICounter extends Document<string> {
    _id: string; // sequence name, e.g. PURCHASE_ORDER
    seq: number;
}
