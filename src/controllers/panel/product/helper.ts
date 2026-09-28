// Helpers
import { empty, getStr, getNum, getBool } from '../../../utils';

//--------------------------------------------------------------
/*
    Pure parsing helpers for the Product admin form.
    The form has no backing REST API - the browser posts plain multipart/form-data using
    bracket-array field names (attributes[0][attributeId], variations[0][sku], ...), which the
    body parser (qs, via express.urlencoded/multer) already turns into real arrays/objects.
    These helpers just clean up/typecast that raw body into the shape Product expects.
*/

export const parseAttributes = (rawAttributes: any = []): any[] => {
    const list = Array.isArray(rawAttributes) ? rawAttributes : Object.values(rawAttributes || {});
    return list
        .filter((row: any) => !empty(row?.attributeId))
        .map((row: any) => ({
            attributeId: row.attributeId,
            attributeValueId: row.attributeValueId || null,
            textValue: row.textValue || null,
            numericValue: !empty(row.numericValue) ? getNum(row.numericValue) : null,
            unit: row.unit || null,
            customValue: row.customValue || null,
            isProductLevelAddition: getBool(row.isProductLevelAddition),
        }));
}

export const parseVariationAttributes = (rawSelections: any = []): any[] => {
    const list = Array.isArray(rawSelections) ? rawSelections : Object.values(rawSelections || {});
    return list
        .filter((row: any) => !empty(row?.attributeId))
        .map((row: any) => ({
            attributeId: row.attributeId,
            valueIds: [].concat(row.valueIds || []).filter(Boolean),
        }));
}

const combinationSignature = (attributeValues: any[] = []): string => {
    return (attributeValues || [])
        .map((av: any) => getStr(av.attributeId) + ':' + getStr(av.attributeValueId))
        .sort()
        .join('|');
}

export const parseVariations = (rawVariations: any = []): any[] => {
    const list = Array.isArray(rawVariations) ? rawVariations : Object.values(rawVariations || {});
    const seen = new Set<string>();
    const result: any[] = [];

    for (const row of list) {
        const attributeValues = (Array.isArray(row?.attributeValues) ? row.attributeValues : Object.values(row?.attributeValues || {}))
            .filter((av: any) => !empty(av?.attributeId) && !empty(av?.attributeValueId))
            .map((av: any) => ({ attributeId: av.attributeId, attributeValueId: av.attributeValueId }));

        if (!attributeValues.length && empty(row?.sku)) continue; // skip fully-blank rows

        const signature = combinationSignature(attributeValues);
        if (signature && seen.has(signature)) continue; // duplicate combination guard (spec: no two variations may share a combination)
        if (signature) seen.add(signature);

        result.push({
            sku: row.sku || null,
            barcode: null,
            attributeValues,

            // the admin form always sets a variation's price directly now (no more
            // inherit-from-global toggle), so every variation is effectively an override
            priceMode: 'OVERRIDE',
            price: !empty(row.price) ? getNum(row.price) : null,
            salePrice: null,
            costPrice: !empty(row.costPrice) ? getNum(row.costPrice) : null,

            stockQuantity: getNum(row.stockQuantity, 0),
            reservedQuantity: getNum(row.reservedQuantity, 0),
            lowStockThreshold: getNum(row.lowStockThreshold, 0),
            backorderAllowed: getBool(row.backorderAllowed),

            image: row.image || null,
            weight: !empty(row.weight) ? getNum(row.weight) : null,
            length: !empty(row.length) ? getNum(row.length) : null,
            width: !empty(row.width) ? getNum(row.width) : null,
            height: !empty(row.height) ? getNum(row.height) : null,

            status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            sortOrder: getNum(row.sortOrder, 0),

            // dynamic pricing (per-variation Raw Material + Weight, no manual
            // override toggle here - keeps the compact variations table simple;
            // the top-level product's Auto Price switch is the Simple-product
            // equivalent) - the actual price is (re)computed by the controller,
            // this just records what to compute it FROM
            rawMaterial: {
                type: row.rawMaterial?.type || null,
                weight: !empty(row.rawMaterial?.weight) ? getNum(row.rawMaterial.weight) : null,
                autoPriced: true,
            },
        });
    }

    return result;
}

export const parseSpecifications = (rawSpecs: any = []): any[] => {
    const list = Array.isArray(rawSpecs) ? rawSpecs : Object.values(rawSpecs || {});
    return list
        .filter((row: any) => !empty(row?.name))
        .map((row: any) => ({
            name: row.name,
            value: row.value || null,
            unit: row.unit || null,
            sortOrder: getNum(row.sortOrder, 0),
            variationSpecific: getBool(row.variationSpecific),
            variationId: row.variationId || null,
        }));
}

// merge newly uploaded images + existing (minus removed) into the final images array {
export const mergeImages = (existingImages: any[] = [], removeKeys: string[] = [], newFileKeys: string[] = [], primaryKey: string | null = null): any[] => {
    const removeSet = new Set(removeKeys || []);
    const kept = (existingImages || []).filter((img: any) => !removeSet.has(img.image));

    const added = (newFileKeys || []).map((key: string, i: number) => ({
        image: key,
        imageType: 'GALLERY',
        altText: null,
        sortOrder: kept.length + i,
        isPrimary: false,
    }));

    const merged = [...kept, ...added];
    if (!merged.length) return merged;

    const hasPrimary = merged.some((img: any) => img.image === primaryKey);
    merged.forEach((img: any) => img.isPrimary = hasPrimary ? img.image === primaryKey : false);
    if (!merged.some((img: any) => img.isPrimary)) merged[0].isPrimary = true; // always keep exactly one primary

    return merged;
}
// } merge newly uploaded images + existing (minus removed) into the final images array

export const getEffectivePrice = (product: any, variation: any): number | null => {
    if (variation?.priceMode === 'OVERRIDE' && !empty(variation?.price)) return variation.price;
    return product?.pricing?.price ?? null;
}

export const getEffectiveSalePrice = (product: any, variation: any): number | null => {
    if (variation?.priceMode === 'OVERRIDE' && !empty(variation?.salePrice)) return variation.salePrice;
    return product?.pricing?.salePrice ?? null;
}

export const getStockStatus = (availableStock: number, lowStockThreshold: number = 0): string => {
    if (availableStock <= 0) return 'OUT_OF_STOCK';
    if (availableStock <= (lowStockThreshold || 0)) return 'LOW_STOCK';
    return 'IN_STOCK';
}
