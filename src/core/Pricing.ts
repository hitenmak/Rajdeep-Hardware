// Models
import { Product } from '../models/product';

// Helpers
import { empty } from '../utils';

//--------------------------------------------------------------
/*
    Dynamic Pricing Engine (spec: "Dynamic Pricing Management" / System Settings
    "Pricing" section). The distributor maintains just two numbers - the current
    Brass rate and Aluminium rate (per kg) - plus a default margin % and tax %.
    Any Simple product, or any individual Variable-product variation, can opt in
    to that raw material by setting its rawMaterial.type + rawMaterial.weight
    (kg of that material per unit); its price is then derived automatically
    instead of being typed in by hand:

        price = (rate per kg * weight) * (1 + margin/100) * (1 + tax/100)

    Whenever the distributor updates a rate (or the margin/tax) in Settings,
    every opted-in product/variation is recalculated in one pass - no manual
    per-product editing. Setting rawMaterial.autoPriced = false on a specific
    product/variation excludes it from that automatic recalculation (the admin
    has manually overridden its price and wants to keep it that way) without
    losing its material/weight bookkeeping.
*/

export interface IPricingRates {
    brassRate: number | null;
    aluminiumRate: number | null;
    defaultMargin: number | null;
    tax: number | null;
}

const rateFor = (materialType: string | null, rates: IPricingRates): number | null => {
    if (materialType === 'BRASS') return rates.brassRate;
    if (materialType === 'ALUMINIUM') return rates.aluminiumRate;
    return null;
}

// the one formula the engine understands today - kept as a single named export
// so the Settings "Pricing Formula" field (free text) can describe it without
// this actually being an arbitrary formula interpreter {
export const calculateMaterialPrice = (materialType: string | null, weight: number | null, rates: IPricingRates): number | null => {
    const rate = rateFor(materialType, rates);
    if (empty(rate) || empty(weight) || Number(weight) <= 0) return null;

    const margin = rates.defaultMargin || 0;
    const tax = rates.tax || 0;
    const price = Number(rate) * Number(weight) * (1 + margin / 100) * (1 + tax / 100);
    return Math.round(price * 100) / 100;
}
// } calculateMaterialPrice

// recomputes every opted-in Simple product's price, and every opted-in
// variation's price (plus that Variable product's top-level display price/
// stock aggregate, matching the convention already used by import/export and
// stock-update), for every product that hasn't been manually overridden {
export const recomputeAllProductPrices = async (rates: IPricingRates): Promise<{ updated: number; skipped: number }> => {
    let updated = 0;
    let skipped = 0;

    const candidates = await Product.find({
        deletedAt: null,
        $or: [
            { 'rawMaterial.type': { $in: ['BRASS', 'ALUMINIUM'] } },
            { 'variations.rawMaterial.type': { $in: ['BRASS', 'ALUMINIUM'] } },
        ],
    });

    for (const product of candidates) {
        let changed = false;

        if (product.productType === 'VARIABLE') {
            (product.variations || []).forEach((variation: any) => {
                if (empty(variation.rawMaterial?.type)) return;
                if (variation.rawMaterial?.autoPriced === false) { skipped += 1; return; }

                const price = calculateMaterialPrice(variation.rawMaterial.type, variation.rawMaterial.weight, rates);
                if (!empty(price) && price !== variation.price) { variation.price = price; changed = true; }
                updated += 1;
            });

            if (changed) {
                const variationPrices = (product.variations || []).map((v: any) => v.price).filter((p: any) => !empty(p));
                if (variationPrices.length) product.pricing.price = Math.min(...variationPrices);
            }
        } else {
            if (empty(product.rawMaterial?.type)) continue;
            if (product.rawMaterial?.autoPriced === false) { skipped += 1; continue; }

            const price = calculateMaterialPrice(product.rawMaterial.type, product.rawMaterial.weight, rates);
            if (!empty(price) && price !== product.pricing.price) { product.pricing.price = price; changed = true; }
            updated += 1;
        }

        if (changed) await product.save();
    }

    return { updated, skipped };
}
// } recomputeAllProductPrices

export default { calculateMaterialPrice, recomputeAllProductPrices };
