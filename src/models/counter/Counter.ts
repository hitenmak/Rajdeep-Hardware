import { Schema, model } from 'mongoose';

// Interfaces
import { ICounter } from './interface';

//--------------------------------------------------------------

const schema: Schema<ICounter> = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
}, { timestamps: true });

export default model<ICounter>('counters', schema, 'counters') as any;
