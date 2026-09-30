// Models
import { PurchaseOrder } from '../models/purchase-order';
import { Product } from '../models/product';

// Helpers
import { empty, getStr, logWarn } from '../utils';
import ProductWatch from './ProductWatch';

//--------------------------------------------------------------
/*
    Stock is held when a PO is approved, and settled when it closes:

        NONE ──approve──▶ RESERVED ──deliver──▶ CONSUMED      (stock and reservation both reduced)
                              └──reject / cancel / back to review──▶ RELEASED

    Each PO records its own state and the exact lines it reserved, and every transition is a
    compare-and-set on that state - so replays, double clicks and master-admin status jumps
    can never reserve, release or deduct the same PO twice. Delivery of a PO that was never
    reserved (e.g. created before this existed) deducts stock directly.
*/

export const STOCK_STATE = {
    NONE: 'NONE',
    RESERVED: 'RESERVED',
    RELEASED: 'RELEASED',
    CONSUMED: 'CONSUMED',
};

// statuses that mean "we have committed to supplying this"
const COMMITTED_STATUSES = ['APPROVED', 'PARTIALLY_APPROVED', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'];
const RELEASE_STATUSES = ['REJECTED', 'CANCELLED', 'PENDING', 'UNDER_REVIEW'];

interface IStockLine {
    productId: any;
    variationId: any | null;
    quantity: number;
}

const UNSETTLED = [null, STOCK_STATE.NONE, STOCK_STATE.RELEASED];

export default class StockReservation {

    // approved quantity when reviewed, otherwise the ordered quantity; untracked products are skipped
    static async linesFor(order: any): Promise<IStockLine[]> {
        const items = (order.items || []).filter((i: any) => !empty(i.productId));
        const products = await Product.find({ _id: { $in: items.map((i: any) => i.productId) } }).select('productType inventory.inventoryTracking variations._id').lean();
        const productById = new Map<string, any>(products.map((p: any) => [getStr(p._id), p]));

        const lines: IStockLine[] = [];
        items.forEach((item: any) => {
            const quantity = Number(item.approvedQuantity ?? item.quantity) || 0;
            const product = productById.get(getStr(item.productId));
            if (quantity <= 0 || !product || product.inventory?.inventoryTracking === false) return;

            if (product.productType === 'VARIABLE') {
                const known = (product.variations || []).some((v: any) => getStr(v._id) === getStr(item.variationId));
                // panel-created lines for variable products carry no variant - nothing precise to hold
                if (!known) return logWarn(`[STOCK-RESERVATION] - PO ${getStr(order.poNumber)}: no variant on line for product ${getStr(item.productId)}, not reserved`);
                lines.push({ productId: item.productId, variationId: item.variationId, quantity });
            } else {
                lines.push({ productId: item.productId, variationId: null, quantity });
            }
        });
        return lines;
    }

    // reservedDelta / stockDelta per unit of each line (e.g. release = -1 / 0, consume = -1 / -1)
    static async #apply(lines: IStockLine[], reservedDelta: number, stockDelta: number): Promise<void> {
        for (const line of lines) {
            const reserved = reservedDelta * line.quantity;
            const stock = stockDelta * line.quantity;

            if (line.variationId) {
                // globalStock is the variations' aggregate, so it moves with the variation's own stock
                await Product.updateOne(
                    { _id: line.productId, 'variations._id': line.variationId },
                    { $inc: { 'variations.$.reservedQuantity': reserved, 'variations.$.stockQuantity': stock, 'inventory.globalStock': stock } },
                );
            } else {
                await Product.updateOne({ _id: line.productId }, { $inc: { 'inventory.reservedQuantity': reserved, 'inventory.globalStock': stock } });
            }
        }
    }

    static async #transition(orderId: any, from: (string | null)[], to: string, lines?: IStockLine[]): Promise<any | null> {
        const set: any = { 'stock.state': to, [`stock.${to.toLowerCase()}At`]: new Date() };
        if (lines) set['stock.lines'] = lines;

        return PurchaseOrder.findOneAndUpdate(
            { _id: orderId, $or: [{ 'stock.state': { $in: from } }, ...(from.includes(null) ? [{ 'stock.state': { $exists: false } }] : [])] },
            { $set: set },
            { new: false, timestamps: false },
        ).lean();
    }

    static async reserve(orderId: any): Promise<void> {
        const order: any = await PurchaseOrder.findById(orderId).lean();
        if (!order) return;
        const lines = await this.linesFor(order);

        const claimed = await this.#transition(orderId, UNSETTLED, STOCK_STATE.RESERVED, lines);
        if (!claimed) return;

        await ProductWatch.track(lines.map((l) => l.productId), () => this.#apply(lines, +1, 0));
    }

    static async release(orderId: any): Promise<void> {
        const claimed = await this.#transition(orderId, [STOCK_STATE.RESERVED], STOCK_STATE.RELEASED);
        if (!claimed) return;

        const lines: IStockLine[] = claimed.stock?.lines || [];
        await ProductWatch.track(lines.map((l) => l.productId), () => this.#apply(lines, -1, 0));
    }

    static async consume(orderId: any): Promise<void> {
        const reservedClaim = await this.#transition(orderId, [STOCK_STATE.RESERVED], STOCK_STATE.CONSUMED);
        if (reservedClaim) {
            const lines: IStockLine[] = reservedClaim.stock?.lines || [];
            return ProductWatch.track(lines.map((l) => l.productId), () => this.#apply(lines, -1, -1));
        }

        // delivered without ever being reserved: take it straight out of stock
        const order: any = await PurchaseOrder.findById(orderId).lean();
        if (!order) return;
        const lines = await this.linesFor(order);
        const directClaim = await this.#transition(orderId, UNSETTLED, STOCK_STATE.CONSUMED, lines);
        if (directClaim) await ProductWatch.track(lines.map((l) => l.productId), () => this.#apply(lines, 0, -1));
    }

    // single entry point for every PO status change
    static async onStatusChange(orderId: any, status: string): Promise<void> {
        if (COMMITTED_STATUSES.includes(status)) return this.reserve(orderId);
        if (status === 'DELIVERED') return this.consume(orderId);
        if (RELEASE_STATUSES.includes(status)) return this.release(orderId);
    }

}
