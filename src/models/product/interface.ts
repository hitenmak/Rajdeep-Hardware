import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IProductImage {
    image: string | null;
    imageType: string | null; // MAIN, GALLERY, THUMBNAIL
    altText: string | null;
    sortOrder: number | null;
    isPrimary: boolean | null;
}

export interface IProductAttributeValue {
    attributeId: Schema.Types.ObjectId;
    attributeValueId: Schema.Types.ObjectId | null;
    textValue: string | null;
    numericValue: number | null;
    unit: string | null;
    customValue: string | null;
    isProductLevelAddition: boolean | null;
}

export interface IVariationAttributeSelection {
    attributeId: Schema.Types.ObjectId;
    valueIds: Schema.Types.ObjectId[];
}

export interface IRawMaterialPricing {
    type: string | null; // BRASS, ALUMINIUM - null means this variation/product uses plain manual pricing
    weight: number | null; // kg of that raw material per unit, used by the dynamic pricing engine
    autoPriced: boolean | null; // false = an admin manually overrode the auto-calculated price; the engine skips it on the next rate change until re-enabled
}

export interface IProductVariation {
    _id?: Schema.Types.ObjectId;
    sku: string | null;
    barcode: string | null;
    attributeValues: { attributeId: Schema.Types.ObjectId; attributeValueId: Schema.Types.ObjectId }[];

    priceMode: string | null; // INHERIT, OVERRIDE
    price: number | null;
    salePrice: number | null;
    costPrice: number | null;
    rawMaterial: IRawMaterialPricing;

    stockQuantity: number | null;
    reservedQuantity: number | null;
    lowStockThreshold: number | null;
    backorderAllowed: boolean | null;

    image: string | null;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;

    status: string | null;
    sortOrder: number | null;
}

export interface IProductSpecification {
    name: string | null;
    value: string | null;
    unit: string | null;
    sortOrder: number | null;
    variationSpecific: boolean | null;
    variationId: Schema.Types.ObjectId | null;
}

export interface IProduct extends Document {
    name: string | null;
    productCode: string | null;
    baseSku: string | null;
    brand: string | null;
    shortDescription: string | null;
    description: string | null;
    productType: string | null; // SIMPLE, VARIABLE

    categoryId: Schema.Types.ObjectId | null;
    subcategoryId: Schema.Types.ObjectId | null;
    childCategoryId: Schema.Types.ObjectId | null;
    additionalCategoryIds: Schema.Types.ObjectId[];
    tags: string[];

    images: IProductImage[];
    attributes: IProductAttributeValue[];

    variationAttributes: IVariationAttributeSelection[];
    variations: IProductVariation[];

    pricing: {
        currency: string | null;
        costPrice: number | null;
        price: number | null;
        salePrice: number | null;
        priceStartDate: Date | null;
        priceEndDate: Date | null;
    };
    rawMaterial: IRawMaterialPricing; // Simple products only - Variable products set this per-variation instead

    inventory: {
        inventoryTracking: boolean | null;
        allowBackorders: boolean | null;
        globalStock: number | null;
        lowStockThreshold: number | null;
    };

    specifications: IProductSpecification[];

    shipping: {
        shippingEnabled: boolean | null;
        weight: number | null;
        length: number | null;
        width: number | null;
        height: number | null;
        shippingClass: string | null;
        freeShipping: boolean | null;
        shippingCharges: number | null;
    };

    tax: {
        category: string | null;
        rate: number | null;
        inclusive: boolean | null;
        hsnSacCode: string | null;
        gstApplicable: boolean | null;
    };

    seo: {
        title: string | null;
        description: string | null;
        keywords: string[];
        slug: string | null;
        canonicalUrl: string | null;
        searchable: boolean | null;
    };

    status: string | null; // DRAFT, ACTIVE, INACTIVE, ARCHIVED
    visibility: string | null; // PUBLIC, PRIVATE, CATALOGUE_ONLY
    featured: boolean | null;
    isNewArrival: boolean | null;
    sortOrder: number | null;

    createdBy: Schema.Types.ObjectId | null;
    updatedBy: Schema.Types.ObjectId | null;

    deletedAt: Date | null;
}
