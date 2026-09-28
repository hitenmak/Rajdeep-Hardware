import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IAttribute } from './interface';

//--------------------------------------------------------------

const schema: Schema<IAttribute> = new Schema({
    name: { type: String, default: null },
    code: { type: String, default: null },
    inputType: { type: String, default: 'TEXT' },
    unit: { type: String, default: null },

    isVariationAttribute: { type: Boolean, default: false },
    isRequired: { type: Boolean, default: false },
    allowCustomValue: { type: Boolean, default: false },

    status: { type: String, default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IAttribute>('attributes', schema, 'attributes') as any;
