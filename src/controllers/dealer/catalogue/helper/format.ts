// Helpers
import { empty, getStr, getNum } from '../../../../utils';
import MediaManager from '../../../../services/media';
import Core from '../../../../core';

// Interfaces
import { IObj } from '../../../../common/interfaces';
import { IDealerPrice, IDealerPricingContext } from '../../../../core/DealerPricing';
import { IAttributeLookup, IStockStatus } from '../../../../core/DealerCatalogue';

//--------------------------------------------------------------
// Explicit whitelists: raw product documents carry cost price, reserved stock and raw-material data.

const imageUrl = (image: any): string | null => empty(image) ? null : MediaManager.Product.get(image);

const sortedImages = (product: IObj): any[] => {
    return [...(product.images || [])].sort((a: any, b: any) =>
        (Number(!!b.isPrimary) - Number(!!a.isPrimary))
        || (Number(b.imageType === 'MAIN') - Number(a.imageType === 'MAIN'))
        || ((a.sortOrder || 0) - (b.sortOrder || 0)));
}

export const primaryImageUrl = (product: IObj): string | null => imageUrl(sortedImages(product)[0]?.image);

const price = (p: IDealerPrice, isFromPrice: boolean = false): IObj => ({
    currency: p.currency,
    dealerPrice: p.dealerPrice,
    mrp: p.mrp,
    discountPercent: p.discountPercent,
    isFromPrice, // true = cheapest variant, show as "from"
});

const stock = (s: IStockStatus): IObj => ({
    inStock: s.inStock,
    availableQuantity: s.availableQuantity,
    lowStock: s.lowStock,
});

export const categoryRef = (category: IObj | null | undefined): IObj | null => {
    if (empty(category)) return null;
    return { id: getStr(category?._id), name: getStr(category?.name), slug: getStr(category?.slug) };
}

export const category = (raw: IObj, extra: { itemCount?: number, hasChildren?: boolean } = {}): IObj => ({
    id: getStr(raw._id),
    parentId: getStr(raw.parentId) || null,
    level: getNum(raw.level),
    name: getStr(raw.name),
    slug: getStr(raw.slug),
    description: getStr(raw.description),
    imageUrl: empty(raw.image) ? null : MediaManager.Category.get(raw.image),
    itemCount: getNum(extra.itemCount),
    hasChildren: !!extra.hasChildren,
});

export const productCard = (product: IObj, ctx: IDealerPricingContext): IObj => {
    const isVariable = Core.DealerCatalogue.isVariable(product);
    const variations = Core.DealerCatalogue.activeVariations(product);
    const resolved = isVariable ? Core.DealerPricing.resolveLowest(ctx, product, variations) : Core.DealerPricing.resolve(ctx, product);

    return {
        id: getStr(product._id),
        name: getStr(product.name),
        sku: getStr(product.baseSku) || getStr(product.productCode),
        imageUrl: primaryImageUrl(product),
        isVariable, // app shows "Choose Option" instead of "Add to Cart"
        isNewArrival: !!product.isNewArrival,
        isClearance: !!product.isClearance,
        price: price(resolved, isVariable && variations.length > 1),
        stock: stock(Core.DealerCatalogue.stock(product)),
    };
}

const attributeRef = (attributeId: any, lookup: IAttributeLookup): IObj => {
    const attribute = lookup.attributes.get(getStr(attributeId));
    return { id: getStr(attributeId), name: getStr(attribute?.name), code: getStr(attribute?.code) };
}

const valueOption = (valueId: any, lookup: IAttributeLookup): IObj | null => {
    const value = lookup.values.get(getStr(valueId));
    if (empty(value) || value.status !== 'ACTIVE') return null;
    return {
        id: getStr(value._id),
        value: getStr(value.displayValue) || getStr(value.value),
        hexCode: getStr(value.hexCode) || null,
        imageUrl: empty(value.image) ? null : MediaManager.AttributeValue.get(value.image),
    };
}

export const productDetail = (product: IObj, ctx: IDealerPricingContext, lookup: IAttributeLookup, categories: IObj = {}): IObj => {
    const isVariable = Core.DealerCatalogue.isVariable(product);
    const variations = Core.DealerCatalogue.activeVariations(product);

    // non-variation attributes, e.g. Material: Solid Brass, Finish: Antique Gold
    const attributes = (product.attributes || [])
        .map((row: any) => ({ ...attributeRef(row.attributeId, lookup), value: Core.DealerCatalogue.attributeDisplayValue(row, lookup) }))
        .filter((row: any) => row.name && row.value);

    // "Available Sizes" style pickers - only values some active variation actually uses
    const usedValueIds = new Set<string>();
    variations.forEach((v: any) => (v.attributeValues || []).forEach((av: any) => usedValueIds.add(getStr(av.attributeValueId))));
    const options = isVariable ? (product.variationAttributes || []).map((va: any) => ({
        ...attributeRef(va.attributeId, lookup),
        values: (va.valueIds || []).filter((id: any) => usedValueIds.has(getStr(id))).map((id: any) => valueOption(id, lookup)).filter(Boolean),
    })).filter((o: any) => o.values.length) : [];

    const variants = isVariable ? variations.map((v: any) => ({
        id: getStr(v._id),
        sku: getStr(v.sku),
        imageUrl: imageUrl(v.image),
        attributes: (v.attributeValues || []).map((av: any) => ({ attributeId: getStr(av.attributeId), valueId: getStr(av.attributeValueId) })),
        price: price(Core.DealerPricing.resolve(ctx, product, v)),
        stock: stock(Core.DealerCatalogue.stock(product, v)),
    })) : [];

    const specifications = [...(product.specifications || [])]
        .filter((s: any) => !s.variationSpecific)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((s: any) => ({ name: getStr(s.name), value: [getStr(s.value), getStr(s.unit)].filter(Boolean).join(' ') }));

    const resolved = isVariable ? Core.DealerPricing.resolveLowest(ctx, product, variations) : Core.DealerPricing.resolve(ctx, product);

    return {
        ...productCard(product, ctx),
        price: price(resolved, isVariable && variations.length > 1),
        brand: getStr(product.brand),
        shortDescription: getStr(product.shortDescription),
        description: getStr(product.description),
        images: sortedImages(product).map((img: any) => ({ url: imageUrl(img.image), altText: getStr(img.altText) })).filter((img: any) => img.url),
        category: categoryRef(categories[getStr(product.categoryId)]),
        subcategory: categoryRef(categories[getStr(product.subcategoryId)]),
        childCategory: categoryRef(categories[getStr(product.childCategoryId)]),
        tags: product.tags || [],
        attributes,
        options,
        variants,
        specifications,
        tax: {
            gstApplicable: !!product.tax?.gstApplicable,
            rate: getNum(product.tax?.rate),
            inclusive: product.tax?.inclusive !== false,
            hsnSacCode: getStr(product.tax?.hsnSacCode),
        },
    };
}
