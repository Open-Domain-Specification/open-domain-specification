

# RiverMart Glossary

## [Catalogue](../boundedcontexts/catalogue/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Product** | One thing that can be sold, independent of who sells it | Item, Listing | Product |
| **SKU** | The identifier of one sellable variant | - | Variant |


## [Search](../boundedcontexts/search/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Relevance** | How well a document answers the query, before price and delivery are weighed | - | Ranker |


## [Offers](../boundedcontexts/offers/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Buy Box** | The default offer a customer adds to cart for a SKU | Featured Offer | BuyBoxService |
| **Offer** | A seller's price, stock and condition for one SKU; first-party retail is a seller like any other for this purpose | - | Offer |


## [Seller Onboarding](../boundedcontexts/seller_onboarding/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Seller** | A third party selling through RiverMart under its own name | Merchant, 3P | SellerAccount |
| **Vendor** | Not a seller. A wholesale supplier to first-party retail, handled by Vendor Purchasing; the two accounts were never unified and will not be | - | Vendor Purchasing (legacy) |


## [Cart & Checkout](../boundedcontexts/cart_&_checkout/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Cart** | The basket a customer fills before checkout | Basket | Cart |


## [Order Management](../boundedcontexts/order_management/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Order** | A paid-for purchase of one or more lines | - | Order |
| **Shipment** | A group of lines travelling together, as the customer tracks it | Package, Parcel | Shipment |
| **Return** | Lines sent back for a refund | RMA | Return |


## [Payments](../boundedcontexts/payments/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Authorisation** | A hold on funds that expires if not captured; the customer sees it as pending | Auth, Hold | Authorisation |


## [Fraud](../boundedcontexts/fraud/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Flag** | A score above threshold; it pauses the subject until reviewed | - | RiskScore |


## [Warehouse](../boundedcontexts/warehouse/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **On hand** | Physically present stock, whether or not reserved | Stock | InventoryPosition |
| **Package** | A box with one tracking label | Parcel | Package |
| **Fulfilment order** | The warehouse's own work record for one customer order at one site. 'Order' alone is ambiguous here: customer order (Orders), purchase order (VPS) or this | - | FulfilmentOrder |


## [Last Mile](../boundedcontexts/last_mile/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Stop** | One address on a route, however many parcels go there | - | Stop |
| **Parcel** | The labelled item handed over at a stop. Orders calls it a shipment and the warehouse a package; the label is the one thing all three agree on | Package | Parcel |


## [Advertising](../boundedcontexts/advertising/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Sponsored slot** | A results-page position sold by auction rather than earned by relevance | Sponsored Product | AuctionService |


## [Customer Service](../boundedcontexts/customer_service/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Case** | One customer problem tracked to an outcome | Ticket, Contact | Case |


## [Vendor Purchasing (legacy)](../boundedcontexts/vendor_purchasing_(legacy)/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Purchase order** | An order RiverMart places with a wholesale vendor; the second of the three meanings of 'order' on a warehouse floor | PO | PurchaseOrder |


## [Identity](../boundedcontexts/identity/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Customer** | The account record. Orders and Cases say customer too but carry only the customerId; nothing about a person lives outside Identity | Account | CustomerAccount |


