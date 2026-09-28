import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface ICategory extends Document {
    parentId: Schema.Types.ObjectId | null;
    level: number;

    name: string | null;
    code: string | null;
    slug: string | null;
    description: string | null;
    image: string | null;
    sortOrder: number | null;
    status: string | null;

    seoTitle: string | null;
    seoDescription: string | null;

    attributeSetId: Schema.Types.ObjectId | null;
    allowSubcategoryAttributeAdditions: boolean | null;
    allowProductLevelAttributeAdditions: boolean | null;

    attributeMode: string | null;
    additionalAttributeIds: Schema.Types.ObjectId[];
    overrideAttributeSetId: Schema.Types.ObjectId | null;

    deletedAt: Date | null;
}
