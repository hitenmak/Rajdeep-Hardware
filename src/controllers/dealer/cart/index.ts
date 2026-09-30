import mongoose from 'mongoose';

// Models
import { DealerCart } from '../../../models/dealer-cart';
import { Product } from '../../../models/product';

// Helpers
import { empty, getStr } from '../../../utils';
import Core from '../../../core';
import { CART_LIMITS } from '../../../core/DealerCart';
import { getOrCreateCart, formatCart } from './helper';
import { validate } from '../common/validate';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

//--------------------------------------------------------------

const assertQuantity = (quantity: any, allowZero: boolean = false): number => {
    const min = allowZero ? 0 : 1;
    if (!Number.isInteger(quantity) || quantity < min || quantity > CART_LIMITS.MAX_QUANTITY) {
        throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.CART.QUANTITY_LIMIT(CART_LIMITS.MAX_QUANTITY));
    }
    return quantity;
}

// same rule the cart screen shows, enforced up-front so the dealer can't add what can't be ordered
const assertOrderable = (product: any, variation: any, quantity: number): void => {
    const stock = Core.DealerCatalogue.stock(product, variation || undefined);
    const issue = Core.DealerCart.stockIssue(stock, product, variation, quantity);
    if (issue?.code === 'OUT_OF_STOCK') throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.CART.OUT_OF_STOCK);
    if (issue?.code === 'INSUFFICIENT_STOCK') throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.CART.INSUFFICIENT_STOCK(issue.availableQuantity || 0));
}

const respond = async (res: any, dealer: any, message: string): Promise<void> => {
    const cart = await getOrCreateCart(dealer._id);
    return res.status(200).send({ status: true, message, data: formatCart(await Core.DealerCart.price(dealer, cart)) });
}

// the product the dealer may order + the chosen variant, or a client error explaining why not
const resolveOrderable = async (dealer: any, productId: string, variationId: string | null): Promise<{ product: any, variation: any }> => {
    const product: any = await Product.findOne(await Core.DealerCatalogue.visibleProductQuery([{ _id: productId }])).lean();
    if (empty(product)) throw new ApiError(HTTP_STATUS.NOT_FOUND, DEALER_MSG.CATALOGUE.PRODUCT.NOT_FOUND);

    let variation: any = null;
    if (Core.DealerCatalogue.isVariable(product)) {
        if (empty(variationId)) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.CART.VARIANT_REQUIRED);
        variation = Core.DealerCart.findVariation(product, variationId);
        if (!variation) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.CART.VARIANT_INVALID);
    } else if (!empty(variationId)) {
        throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.CART.VARIANT_NOT_ALLOWED);
    }

    const ctx = await Core.DealerPricing.buildContext(dealer, [product._id]);
    if (Core.DealerPricing.resolve(ctx, product, variation || undefined).dealerPrice === null) {
        throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.CART.NO_PRICE);
    }

    return { product, variation };
}

export default class Cart {

    static async details(req: any, res: any): Promise<void> {
        try {
            return await respond(res, req.authDealer, DEALER_MSG.CART.FOUND);
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CART-DETAILS] -');
        }
    }

    // adding a product+variant already in the cart increases its quantity
    static async add(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                productId: `required | objectId`,
                variationId: `objectId`,
                quantity: `required | number`,
            });
            const quantity = assertQuantity(body.quantity);
            const variationId = empty(body.variationId) ? null : body.variationId;

            const { product, variation } = await resolveOrderable(authDealer, body.productId, variationId);

            const cart = await getOrCreateCart(authDealer._id);
            const match = { productId: new mongoose.Types.ObjectId(body.productId), variationId: variationId ? new mongoose.Types.ObjectId(variationId) : null };
            const existing = (cart.items || []).find((i: any) => getStr(i.productId) === getStr(match.productId) && getStr(i.variationId) === getStr(match.variationId));

            const newQuantity = assertQuantity((existing?.quantity || 0) + quantity);
            assertOrderable(product, variation, newQuantity);

            if (existing) {
                await DealerCart.updateOne({ dealerId: authDealer._id, 'items._id': existing._id }, { $set: { 'items.$.quantity': newQuantity } });
            } else {
                // conditional push: no duplicate line under concurrent adds, and the line cap holds atomically
                // (matchedCount, not modifiedCount: timestamps always modify updatedAt)
                const pushed = await DealerCart.updateOne(
                    { dealerId: authDealer._id, items: { $not: { $elemMatch: match } }, [`items.${CART_LIMITS.MAX_LINES - 1}`]: { $exists: false } },
                    { $push: { items: { ...match, quantity, addedAt: new Date() } } },
                );
                if (!pushed.matchedCount) {
                    const raced = await DealerCart.updateOne({ dealerId: authDealer._id, items: { $elemMatch: match } }, { $inc: { 'items.$.quantity': quantity } });
                    if (!raced.matchedCount) throw new ApiError(HTTP_STATUS.CONFLICT, DEALER_MSG.CART.TOO_MANY_LINES(CART_LIMITS.MAX_LINES));
                }
            }

            return await respond(res, authDealer, DEALER_MSG.CART.ITEM_ADDED);
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CART-ADD] -');
        }
    }

    // quantity 0 removes the line
    static async update(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                itemId: `required | objectId`,
                quantity: `required | number`,
            });
            const quantity = assertQuantity(body.quantity, true);

            const cart = await getOrCreateCart(authDealer._id);
            const item = (cart.items || []).find((i: any) => getStr(i._id) === body.itemId);
            if (!item) throw new ApiError(HTTP_STATUS.NOT_FOUND, DEALER_MSG.CART.ITEM_NOT_FOUND);

            if (quantity === 0) {
                await DealerCart.updateOne({ dealerId: authDealer._id }, { $pull: { items: { _id: item._id } } });
                return await respond(res, authDealer, DEALER_MSG.CART.ITEM_REMOVED);
            }

            // increasing must still be orderable; lines that became unavailable can only be reduced/removed
            if (quantity > item.quantity) {
                const { product, variation } = await resolveOrderable(authDealer, getStr(item.productId), getStr(item.variationId) || null);
                assertOrderable(product, variation, quantity);
            }

            await DealerCart.updateOne({ dealerId: authDealer._id, 'items._id': item._id }, { $set: { 'items.$.quantity': quantity } });
            return await respond(res, authDealer, DEALER_MSG.CART.ITEM_UPDATED);
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CART-UPDATE] -');
        }
    }

    static async remove(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const body = await validate(req?.body, {
                itemId: `required | objectId`,
            });

            // match the line in the filter: timestamps make modifiedCount 1 even when $pull removes nothing
            const result = await DealerCart.updateOne({ dealerId: authDealer._id, 'items._id': body.itemId }, { $pull: { items: { _id: body.itemId } } });
            if (!result.matchedCount) throw new ApiError(HTTP_STATUS.NOT_FOUND, DEALER_MSG.CART.ITEM_NOT_FOUND);

            return await respond(res, authDealer, DEALER_MSG.CART.ITEM_REMOVED);
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CART-REMOVE] -');
        }
    }

    static async clear(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            await DealerCart.updateOne({ dealerId: authDealer._id }, { items: [] });
            return await respond(res, authDealer, DEALER_MSG.CART.CLEARED);
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-CART-CLEAR] -');
        }
    }

}
