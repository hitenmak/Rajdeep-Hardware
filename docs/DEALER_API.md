# Dealer App API

Backend for the Rajdeep dealer mobile app (Figma "RAJDEEP", final flow).
Base path: `/dealer`. Every endpoint is `POST` with a JSON body (except the photo upload, which is multipart).

## Conventions

**Envelope** - every response:

```json
{ "status": true, "message": "Human readable text", "data": { } }
```

**Auth** - endpoints marked 🔒 need `Authorization: Bearer <accessToken>`.

**Status codes**

| Code | Meaning | App action |
|---|---|---|
| 200 / 201 | OK / created | - |
| 401 | Missing, invalid or expired token; session revoked | Call `/auth/token/refresh`; if that also fails, go to Login |
| 403 | Account not approved, suspended or inactive (`message` says which) | Show message, log out |
| 404 | Not found, or not yours | - |
| 409 | Conflict: stock, price or cart changed, checkout already running | Show `message`; re-render from `data.cart` when present |
| 422 | Validation error (`message` lists the fields) | Show inline |
| 423 | Account locked after 5 failed logins (15 min) | Show message |
| 429 | Too many attempts / OTP resend too soon | Show message, wait |
| 500 | Server error | Retry later |

**Paging** - list endpoints accept `page` (default 1) and `limit` (default 20, max 50) and return:

```json
"pagination": { "page": 1, "limit": 20, "totalDocs": 48, "totalPages": 3, "hasNextPage": true }
```

**Money** is in INR, as numbers with at most 2 decimals. **Dates** are ISO-8601 UTC. Month keys (`"2026-09"`) follow the distributor's timezone (Settings > General, default Asia/Kolkata).

---

## 1. Authentication

Dealers are created by admin in the panel, **without a password**. First-time setup uses the Forgot Password flow.

### `/auth/login`

| Body | Type | |
|---|---|---|
| `email` | string | required, case-insensitive |
| `password` | string | required |
| `rememberMe` | boolean | default `true` = 30-day session, `false` = 1-day session |
| `fcmToken` | string | optional, enables push on this device |

Response `data`:

```json
{
  "tokenType": "Bearer",
  "accessToken": "…", "accessTokenExpiresIn": 86400,
  "refreshToken": "…", "refreshTokenExpiresAt": "2026-10-30T10:00:00.000Z",
  "dealer": { "id", "dealerCode", "businessName", "contactName", "email", "phoneCode", "phone",
              "address", "city", "state", "country", "taxNumber", "status", "approvalStatus" }
}
```

Store both tokens securely. The access token lasts 1 day.

### `/auth/token/refresh`

Body `{ refreshToken }` returns the same shape as login. **The old refresh token stops working immediately**, so always store the new one.
Serialise refreshes: if two refreshes run in parallel with the same token, it counts as token reuse and the session is revoked.

### `/auth/token/validate` 🔒

Returns `{ dealer, session: { id, expiresAt } }`. Use it on app start ("am I still logged in?").

### `/auth/logout` 🔒

Body `{ allDevices?: boolean }`. Revokes this session, or every session for this dealer.

### Forgot / reset password (Verify OTP screen)

| Step | Endpoint | Body | Returns |
|---|---|---|---|
| 1 | `/auth/password/forgot` | `{ email }` | `{ email, otpExpireInSecond: 300, otpLength: 4, resendInSecond: 45, token }` |
| 2 (optional) | `/auth/password/otp/resend` | `{ token }` | same as step 1, with a new `token` |
| 3 | `/auth/password/otp/verify` | `{ token, otp }` (4 digits) | `{ resetToken, resetTokenExpiresIn: 600 }` |
| 4 | `/auth/password/reset` | `{ resetToken, password, confirmPassword }` | `{}`; then go to Login |

- Step 1 answers the same for unknown emails (no account enumeration).
- Resend is allowed once every 45 s (otherwise 429). Drive the "Resend code in 00:45" timer from `resendInSecond`.
- 5 wrong OTPs invalidate the code (429); the dealer must request a new one.
- Resetting a password signs the dealer out on all devices.
- Password rules (server-side): 6-20 characters, no spaces.

> Design gap: there is no "Set new password" screen after Verify OTP in Figma. The app needs one for step 4.

### `/auth/password/change` 🔒

Body `{ currentPassword, newPassword, confirmPassword }`. Signs out every other device; the current one stays logged in.

---

## 2. Home & Catalogue 🔒

Every price below is **this dealer's price**. It resolves in this order: a product-specific dealer price, then a category discount, then the dealer's default discount, then the base price. `mrp` is the list price (strike-through).

**Product card** (used in lists):

```json
{
  "id", "name", "sku", "imageUrl", "isVariable", "isNewArrival", "isClearance",
  "price": { "currency": "INR", "dealerPrice": 1250, "mrp": 1800, "discountPercent": 30.56, "isFromPrice": false },
  "stock": { "inStock": true, "availableQuantity": 342, "lowStock": false }
}
```

- `isVariable: true`: show **Choose Option** (open details), not Add to Cart.
- `isFromPrice: true`: the price is the cheapest variant ("from ₹…").
- `availableQuantity: null`: stock isn't tracked for this product.

### `/home`

`{ dealer: { businessName, contactName }, unreadNotificationCount, clearanceCount, newArrivals: [card], categories: [category] }`

`clearanceCount` is the number of clearance products currently in stock. Use it for the Offer tab badge or the "Shop Now" banner.

Category: `{ id, parentId, level, name, slug, description, imageUrl, itemCount, hasChildren }`

### `/catalogue/category/list`

Body `{ parentId?, search?, page, limit }`. Without `parentId` it returns root categories. With `search` it searches every level.

### `/catalogue/product/list`

| Body | |
|---|---|
| `search` | free text (max 100 chars) |
| `searchBy` | `all` (default) · `name` · `sku` · `category` · `material` (the chips on the search screen) |
| `categoryId` | includes products in its sub-categories |
| `inStock` | boolean |
| `newArrival` | boolean |
| `clearance` | boolean: only products flagged as Clearance Stock |
| `sort` | `recommended` (default) · `newest` · `name_asc` · `name_desc` |
| `page`, `limit` | |

Returns `{ records: [card], pagination }`. A search on page 1 is saved to Recent Searches.

### `/catalogue/product/details`

Body `{ productId }`. Returns the card fields plus:

```json
{
  "brand", "shortDescription", "description",
  "images": [{ "url", "altText" }],
  "category": { "id", "name", "slug" }, "subcategory": { … }, "childCategory": { … },
  "tags": [],
  "attributes": [{ "id", "name": "Material", "code", "value": "Solid Brass" }],
  "options": [{ "id", "name": "Size", "code", "values": [{ "id", "value": "6\"", "hexCode", "imageUrl" }] }],
  "variants": [{ "id", "sku", "imageUrl", "attributes": [{ "attributeId", "valueId" }], "price": { … }, "stock": { … } }],
  "specifications": [{ "name": "Weight", "value": "480 grams" }],
  "tax": { "gstApplicable": true, "rate": 18, "inclusive": false, "hsnSacCode" }
}
```

To pick a variant, find the entry in `variants` whose `attributes` match the selected option values, then send its `id` as `variationId` to the cart.

### Search

| Endpoint | Body | Returns |
|---|---|---|
| `/catalogue/search/suggestions` | `{ search, searchBy? }` | `{ products: [{ id, name, sku, imageUrl, category }], categories: [{ id, name, slug }] }`: type-ahead from 2 characters, not saved |
| `/catalogue/search/recent` | `{}` | `{ records: [{ term, searchedAt }] }`: newest first, max 10 |
| `/catalogue/search/recent/remove` | `{ term }` | updated `records` |
| `/catalogue/search/recent/clear` | `{}` | `{ records: [] }` |

### `/offer/list` - Offer tab

Body `{ categoryId?, search?, page, limit }`. Returns `{ records: [card], pagination }`: products the admin flagged **Clearance Stock** that are still in stock, with the biggest saving first on each page.

---

## 3. Cart & Purchase Order 🔒

The cart stores only product, variant and quantity. **Prices and stock are recalculated on every call**, so always render from the latest response.

### Cart response (all cart endpoints)

```json
{
  "items": [{
    "itemId", "productId", "variationId", "name", "sku", "variantLabel": "Antique Gold | 6 inch", "imageUrl",
    "quantity": 100, "unitPrice": 1250, "mrp": 1800, "taxRate": 18, "taxInclusive": false,
    "lineSubtotal": 125000, "lineTax": 22500, "lineTotal": 147500,
    "stock": { … },
    "issue": null
  }],
  "summary": { "itemCount", "totalQuantity", "subtotal", "tax", "taxRate": 18, "taxBreakdown": [{ "rate": 18, "amount" }],
               "shipping": 0, "total", "currency": "INR" },
  "canCheckout": true
}
```

- `issue` is `{ code, message, availableQuantity }` when a line can't be ordered as-is: `UNAVAILABLE`, `NO_PRICE`, `OUT_OF_STOCK` or `INSUFFICIENT_STOCK`. Lines with an issue are excluded from `summary`, and `canCheckout` is `false`.
- `taxRate` is `null` when the lines have different GST rates. In that case show `taxBreakdown` instead of "GST @ 18%".
- `unitPrice` is the "₹1,250 / unit" figure. For GST-inclusive products GST is backed out of it; otherwise GST is added on top.

| Endpoint | Body |
|---|---|
| `/cart/details` | `{}` |
| `/cart/item/add` | `{ productId, variationId?, quantity }`: `variationId` is required for variable products. Adding the same item again increases its quantity. |
| `/cart/item/update` | `{ itemId, quantity }`: `0` removes the line |
| `/cart/item/remove` | `{ itemId }` |
| `/cart/clear` | `{}` |

Quantity must be a whole number from 1 to 100,000. A cart holds at most 100 lines. Adding more than the available stock returns 409 "Only N unit(s) available".

### `/order/create` - "Create PO"

| Body | |
|---|---|
| `shippingAddress` | required |
| `specialInstructions` | optional; required only if admin enabled it in Settings > Purchase Orders |
| `termsAccepted` | must be `true` (the checkbox) |
| `expectedTotal` | **recommended**: the `summary.total` the dealer reviewed |

- **201**: the order detail (see below). The ordered lines are removed from the cart.
- **409** with `data.cart`: something changed (a price differs from `expectedTotal`, stock ran out, or a product was hidden). Show the returned cart and ask the dealer to confirm again.
- **409** "already being placed": duplicate tap; ignore it.

### Orders

| Endpoint | Body | Returns |
|---|---|---|
| `/order/list` | `{ month?: "YYYY-MM", status?, page, limit }` | `{ summary: { totalOrders, thisMonthAmount, averageOrderValue }, months: ["2026-09", …], records: [order card], pagination }` |
| `/order/details` | `{ orderId }` | order detail |
| `/order/pdf` | `{ orderId }` | `{ url, fileName }`: PO Preview / share. Generated on first request and reused until the PO changes. |

`months` gives the month chips (newest first, up to 12). Cancelled and rejected orders are excluded from `thisMonthAmount` and `averageOrderValue`.

**Stock:** placing a PO doesn't hold stock. When admin approves it, the approved quantities are reserved and disappear from `availableQuantity` for every dealer. They're deducted from stock on delivery, and released again if the PO is rejected or cancelled.

Order card: `{ id, poNumber, orderDate, itemCount, totalQuantity, totalAmount, currency, status: { key, label, group } }`

Order detail adds: `statusMessage, lastUpdatedAt, source, shippingAddress, specialInstructions, items[{ id, productId, variationId, name, sku, variantLabel, quantity, approvedQuantity, rejectedQuantity, unitPrice, mrp, tax, total }], summary{ subtotal, discount, tax, shipping, total }, timeline[{ status, at }]`

| `status.key` | `label` | `group` |
|---|---|---|
| PENDING | Pending Approval | PENDING |
| UNDER_REVIEW | Under Review | PENDING |
| APPROVED | Approved | IN_PROGRESS |
| PARTIALLY_APPROVED | Partially Approved | IN_PROGRESS |
| PACKING / READY_FOR_DELIVERY | Processing | IN_PROGRESS |
| OUT_FOR_DELIVERY | Out for Delivery | IN_PROGRESS |
| DELIVERED | Delivered | COMPLETED |
| REJECTED | Rejected | CLOSED |
| CANCELLED | Cancelled | CLOSED |

---

## 4. Account 🔒

### `/profile/details`

Returns the dealer fields (as in login) plus `profileImageUrl`, `activeSince` and `stats: { totalOrders, totalSpent }`.

### `/profile/image/set`

`multipart/form-data`, field **`profileImage`** (an image). Returns `{ profileImageUrl }`. A rejected file returns 422 and keeps the current photo.

### `/profile/image/remove`

Returns `{ profileImageUrl: null }`.

### `/dashboard` - Dealer Dashboard

```json
{
  "dealer": { "businessName", "contactName" },
  "summary": { "monthlySales", "ordersThisMonth", "pendingOrders", "currency", "month": "2026-09" },
  "analytics": [{ "month": "2026-04", "label": "Apr", "amount", "orders" }],
  "recentOrders": [order card]
}
```

`analytics` always has 6 entries, oldest first (months with no orders show 0).

### Notifications

| Endpoint | Body | Returns |
|---|---|---|
| `/notification/list` | `{ page, limit }` | `{ unreadCount, records: [{ id, type, title, description, navigateTo, data, isRead, createdAt }], pagination }` |
| `/notification/read` | `{ notificationId }` | `{ unreadCount }` |
| `/notification/read-all` | `{}` | `{ unreadCount: 0 }` |

Push messages carry the same `type`, `navigateTo` and `data` as the in-app record.

| `type` | Sent when | `navigateTo` | `data` |
|---|---|---|---|
| `ORDER_STATUS` | Admin reviews or moves one of your POs (approved, processing, out for delivery, delivered, rejected, cancelled) | `ORDER_DETAILS` | `{ orderId, poNumber, status }` |
| `PRICE_UPDATED` | A product's price changes and **your** price actually moved. Dealers on a fixed price for that product aren't told. | `PRODUCT_DETAILS` | `{ productId, oldPrice, newPrice }` |
| `NEW_ARRIVAL` | A product is published to the catalogue, or flagged "New Product" | `PRODUCT_DETAILS` | `{ productId }` |
| `LOW_STOCK` | A product you've ordered before drops to its low-stock level | `PRODUCT_DETAILS` | `{ productId, availableQuantity }` |

When a bulk admin action affects more than 3 products at once, you get a single summary instead (for example "Prices changed for 12 products"). It has `navigateTo: "CATALOGUE"` (or `"NEW_ARRIVALS"`) and `data: { productIds: [...] }`.

### App Preferences

| Endpoint | Body |
|---|---|
| `/preference/details` | `{}`: returns `{ pushNotifications, emailNotifications, smsAlerts, language, languages: [{ code, label }] }`. Only English (`en`) is supported for now. |
| `/preference/update` | any subset of `{ pushNotifications, emailNotifications, smsAlerts, language }` |

### `/config/support` - Help & Support / About

`{ company: { name, logoUrl, website, address }, support: { phone, whatsappUrl, email }, bankDetails, app: { android: { latestVersion, appLink }, ios: { … } } }`, all taken from admin Settings.

`bankDetails` is `{ bankName, accountName, accountNumber, ifscCode, branch, upiId }`, or `null` when admin hasn't entered any. The same details are printed on PO PDFs.

### `/config/faq`

`{ records: [{ id, question, answer }] }`: the active FAQs in admin's sort order (Administration > FAQs). Answers are plain text; keep the line breaks.

### `/config/terms`

`{ content, updatedAt }`: the full Terms & Conditions from Settings > Terms & Conditions (plain text, line breaks kept). `content` is `null` until admin adds it.

---

## Admin-side controls that affect the app

| Admin panel | Effect in the app |
|---|---|
| Product > Publish > **Clearance Stock** | Product appears in the Offer tab |
| Product > Publish > **New Product** | Product appears in New Arrivals and triggers a `NEW_ARRIVAL` notification |
| Administration > **FAQs** | `/config/faq` |
| Settings > **Bank Details** | `/config/support` → `bankDetails`, and PO PDFs |
| Settings > **Terms & Conditions** | `/config/terms`, and the PO terms printed on PDFs |
