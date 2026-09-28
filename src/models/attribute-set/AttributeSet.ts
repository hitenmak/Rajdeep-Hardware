import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IAttributeSet } from './interface';

//--------------------------------------------------------------

const itemSchema = new Schema({
    attributeId: { type: Schema.Types.ObjectId, ref: 'attributes', default: null },
    isRequired: { type: Boolean, default: false },
    isVariationAttribute: { type: Boolean, default: false },
    allowedValueIds: [{ type: Schema.Types.ObjectId, ref: 'attributeValues', default: [] }],
    sortOrder: { type: Number, default: 0 },
}, { _id: false });

const schema: Schema<IAttributeSet> = new Schema({
    name: { type: String, default: null },
    code: { type: String, default: null },
    description: { type: String, default: null },
    status: { type: String, default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },

    items: { type: [itemSchema], default: [] },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IAttributeSet>('attributeSets', schema, 'attributeSets') as any;
