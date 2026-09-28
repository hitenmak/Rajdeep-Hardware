import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IProduct } from './interface';

//--------------------------------------------------------------

const imageSchema = new Schema({
    image: { type: String, default: null },
    imageType: { type: String, default: 'GALLERY' },
    altText: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
}, { _id: false });

const productAttributeSchema = new Schema({
    attributeId: { type: Schema.Types.ObjectId, ref: 'attributes', default: null },
    attributeValueId: { type: Schema.Types.ObjectId, ref: 'attributeValues', default: null },
    textValue: { type: String, default: null },
    numericValue: { type: Number, default: null },
    unit: { type: String, default: null },
    customValue: { type: String, default: null },
    isProductLevelAddition: { type: Boolean, default: false },
}, { _id: false });

const variationAttributeSelectionSchema = new Schema({
    attributeId: { type: Schema.Types.ObjectId, ref: 'attributes', default: null },
    valueIds: [{ type: Schema.Types.ObjectId, ref: 'attributeValues', default: [] }],
}, { _id: false });

const rawMaterialPricingSchema = new Schema({
    type: { type: String, default: null }, // BRASS, ALUMINIUM
    weight: { type: Number, default: null },
    autoPriced: { type: Boolean, default: true },
}, { _id: false });

const variationSchema = new Schema({
    sku: { type: String, default: null },
    barcode: { type: String, default: null },
    attributeValues: [{
        attributeId: { type: Schema.Types.ObjectId, ref: 'attributes' },
        attributeValueId: { type: Schema.Types.ObjectId, ref: 'attributeValues' },
        _id: false,
    }],

    priceMode: { type: String, default: 'INHERIT' },
    price: { type: Number, default: null },
    salePrice: { type: Number, default: null },
    costPrice: { type: Number, default: null },
    rawMaterial: { type: rawMaterialPricingSchema, default: () => ({}) },

    stockQuantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    backorderAllowed: { type: Boolean, default: false },

    image: { type: String, default: null },
    weight: { type: Number, default: null },
    length: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    status: { type: String, default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },
});

const specificationSchema = new Schema({
    name: { type: String, default: null },
    value: { type: String, default: null },
    unit: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    variationSpecific: { type: Boolean, default: false },
    variationId: { type: Schema.Types.ObjectId, default: null },
}, { _id: false });

const schema: Schema<IProduct> = new Schema({
    name: { type: String, default: null },
    productCode: { type: String, default: null },
    baseSku: { type: String, default: null },
    brand: { type: String, default: null },
    shortDescription: { type: String, default: null },
    description: { type: String, default: null },
    productType: { type: String, default: 'SIMPLE' },

    // Categories are a self-referencing 3-level tree (level 0/1/2), all in the
    // same 'categories' collection - these three explicit slots map 1:1 onto
    // the product form's three cascading selects.
    categoryId: { type: Schema.Types.ObjectId, ref: 'categories', default: null },
    subcategoryId: { type: Schema.Types.ObjectId, ref: 'categories', default: null },
    childCategoryId: { type: Schema.Types.ObjectId, ref: 'categories', default: null },
    additionalCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'categories', default: [] }],
    tags: [{ type: String, default: [] }],

    images: { type: [imageSchema], default: [] },
    attributes: { type: [productAttributeSchema], default: [] },

    variationAttributes: { type: [variationAttributeSelectionSchema], default: [] },
    variations: { type: [variationSchema], default: [] },

    pricing: {
        currency: { type: String, default: 'INR' },
        costPrice: { type: Number, default: null },
        price: { type: Number, default: null },
        salePrice: { type: Number, default: null },
        priceStartDate: { type: Date, default: null },
        priceEndDate: { type: Date, default: null },
    },
    rawMaterial: { type: rawMaterialPricingSchema, default: () => ({}) },

    inventory: {
        inventoryTracking: { type: Boolean, default: true },
        allowBackorders: { type: Boolean, default: false },
        globalStock: { type: Number, default: 0 },
        lowStockThreshold: { type: Number, default: 0 },
    },

    specifications: { type: [specificationSchema], default: [] },

    shipping: {
        shippingEnabled: { type: Boolean, default: true },
        weight: { type: Number, default: null },
        length: { type: Number, default: null },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        shippingClass: { type: String, default: null },
        freeShipping: { type: Boolean, default: false },
        shippingCharges: { type: Number, default: null },
    },

    tax: {
        category: { type: String, default: null },
        rate: { type: Number, default: null },
        inclusive: { type: Boolean, default: true },
        hsnSacCode: { type: String, default: null },
        gstApplicable: { type: Boolean, default: false },
    },

    seo: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        keywords: [{ type: String, default: [] }],
        slug: { type: String, default: null },
        canonicalUrl: { type: String, default: null },
        searchable: { type: Boolean, default: true },
    },

    status: { type: String, default: 'DRAFT' },
    visibility: { type: String, default: 'PUBLIC' },
    featured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },

    deletedAt: { type: Date, default: null },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IProduct>('products', schema, 'products') as any;
