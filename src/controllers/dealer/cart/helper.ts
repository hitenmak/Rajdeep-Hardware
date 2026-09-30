// Models
import { DealerCart } from '../../../models/dealer-cart';

// Helpers
import { empty } from '../../../utils';
import MediaManager from '../../../services/media';
import { primaryImageUrl } from '../catalogue/helper/format';

// Others
import { DEALER_MSG } from '../../../common/messages';

// Interfaces
import { IObj } from '../../../common/interfaces';
import { IPricedCart, IPricedCartLine } from '../../../core/DealerCart';

//--------------------------------------------------------------

export const getOrCreateCart = (dealerId: any): Promise<any> => {
    return DealerCart.findOneAndUpdate({ dealerId }, { $setOnInsert: { dealerId, items: [] } }, { upsert: true, new: true }).lean();
}

const line = (l: IPricedCartLine): IObj => ({
    itemId: l.itemId,
    productId: l.productId,
    variationId: l.variationId,
    name: l.name,
    sku: l.sku,
    variantLabel: l.variantLabel,
    imageUrl: !empty(l.variation?.image) ? MediaManager.Product.get(l.variation.image) : (l.product ? primaryImageUrl(l.product) : null),
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    mrp: l.mrp,
    taxRate: l.taxRate,
    taxInclusive: l.taxInclusive,
    lineSubtotal: l.lineSubtotal,
    lineTax: l.lineTax,
    lineTotal: l.lineTotal,
    stock: l.stock ? { inStock: l.stock.inStock, availableQuantity: l.stock.availableQuantity, lowStock: l.stock.lowStock } : null,
    issue: l.issue ? { ...l.issue, message: DEALER_MSG.CART.ISSUE[l.issue.code] } : null,
});

export const formatCart = (priced: IPricedCart): IObj => ({
    items: priced.lines.map(line),
    summary: priced.summary,
    canCheckout: priced.canCheckout,
});
