import { Schema, Document } from 'mongoose';

//--------------------------------------------------------------

export interface IPurchaseOrderItem {
    productId: Schema.Types.ObjectId | null;
    variationId: Schema.Types.ObjectId | null;
    sku: string | null;
    productName: string | null; // snapshot at order time, survives later product edits
    variantLabel: string | null; // snapshot, e.g. "Antique Gold | 6 inch"
    mrp: number | null;

    quantity: number | null;
    unitPrice: number | null;
    discount: number | null;
    tax: number | null;
    total: number | null;

    approvedQuantity: number | null;
    rejectedQuantity: number | null;
    remarks: string | null;
}

export interface IPurchaseOrder extends Document {
    poNumber: string | null;
    dealerId: Schema.Types.ObjectId | null;
    orderDate: Date | null;

    items: IPurchaseOrderItem[];

    subtotal: number | null;
    discount: number | null;
    tax: number | null;
    shipping: number | null;
    totalAmount: number | null;

    remarks: string | null; // dealer app: "Special Instructions"
    status: string | null;

    source: string | null; // PANEL, DEALER_APP
    shippingAddress: string | null;
    termsAcceptedAt: Date | null;
    pdf: {
        fileName: string | null;
        generatedAt: Date | null;
    };
    // PENDING, UNDER_REVIEW, PARTIALLY_APPROVED, APPROVED, PACKING,
    // READY_FOR_DELIVERY, OUT_FOR_DELIVERY, DELIVERED, REJECTED, CANCELLED

    assignedPackageManagerId: Schema.Types.ObjectId | null;
    assignedDeliveryManagerId: Schema.Types.ObjectId | null;

    createdBy: Schema.Types.ObjectId | null;
    updatedBy: Schema.Types.ObjectId | null;

    deletedAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}
