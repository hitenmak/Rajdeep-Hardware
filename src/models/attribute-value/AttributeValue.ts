import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IAttributeValue } from './interface';

//--------------------------------------------------------------

const schema: Schema<IAttributeValue> = new Schema({
    attributeId: { type: Schema.Types.ObjectId, ref: 'attributes', default: null },

    value: { type: String, default: null },
    code: { type: String, default: null },
    displayValue: { type: String, default: null },
    hexCode: { type: String, default: null },
    image: { type: String, default: null },
    description: { type: String, default: null },

    sortOrder: { type: Number, default: 0 },
    status: { type: String, default: 'ACTIVE' },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IAttributeValue>('attributeValues', schema, 'attributeValues') as any;
