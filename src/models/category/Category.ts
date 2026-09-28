import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { ICategory } from './interface';

//--------------------------------------------------------------

const schema: Schema<ICategory> = new Schema({
    // Self-referencing tree: null = level 0 (root category). `level` is always
    // server-derived from the resolved parent - never trusted from the request body.
    parentId: { type: Schema.Types.ObjectId, ref: 'categories', default: null },
    level: { type: Number, default: 0 },

    name: { type: String, default: null },
    code: { type: String, default: null },
    slug: { type: String, default: null },
    description: { type: String, default: null },
    image: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, default: 'ACTIVE' },

    seoTitle: { type: String, default: null },
    seoDescription: { type: String, default: null },

    // Settable at any level - a non-root node can become its own attribute-set
    // root via attributeMode:OVERRIDE below.
    attributeSetId: { type: Schema.Types.ObjectId, ref: 'attributeSets', default: null },
    allowSubcategoryAttributeAdditions: { type: Boolean, default: true },
    allowProductLevelAttributeAdditions: { type: Boolean, default: true },

    // Meaningful only when level > 0 (forced back to INHERIT/empty/null for
    // root categories by the controller); folded in from the old Subcategory model.
    attributeMode: { type: String, default: 'INHERIT' },
    additionalAttributeIds: [{ type: Schema.Types.ObjectId, ref: 'attributes', default: [] }],
    overrideAttributeSetId: { type: Schema.Types.ObjectId, ref: 'attributeSets', default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<ICategory>('categories', schema, 'categories') as any;
