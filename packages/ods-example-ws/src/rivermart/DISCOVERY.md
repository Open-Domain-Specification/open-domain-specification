# RiverMart: discovery record

How the model in `workspace.ts` was arrived at. The method is the interview playbook from
the ODS skill (`packages/skill/skill/references/interview-playbook.md`): orientation, the
problem space, ownership, the integration map, then the inside of each context and its
behaviour, finishing with validation. The translation table decided what each thing people
said became in the model. Interview summaries are written in the voice of the person we
spoke to; they are composites, not transcripts.

## 1. Orientation

Two sessions with the CTO office produced the brief. The one-sentence answer to "what does
this system do, and for whom" was: "It lets anyone sell almost anything to our customers,
and gets it to them tomorrow." That became the workspace description, and it fixed the
order of the interviews: start with the people who decide what is sold and who wins the
sale, then the people who move it, then the people who take the money and clean up.

## 2. Stakeholder interviews

### Head of Marketplace

"Everything here is about the buy box. A product page shows one offer by default, and that
offer gets the sale nine times out of ten. We compute the winner from landed price,
delivery promise and seller rating, and we recompute it whenever an offer changes. Sellers
publish offers against catalogue products; they don't create products, the Catalogue team
guards that. An offer is a seller's price, stock and condition for one SKU, and a seller can
only have one active offer per SKU, otherwise the comparison is meaningless. When Seller
Services suspends a seller we pull every one of their offers, immediately, no batch. The
catalogue sends us events when products appear or disappear and we keep our own SKU list
from them; we don't want their whole product model in our tables. Checkout is our biggest
customer for reads and they get a say when we change the offer API."

Recorded as: the Offers context serving the core "Offers & Buy Box" subdomain; the Offer
aggregate with `PricePositive` and `OneActiveOfferPerSellerSku`; the BuyBoxService domain
service; the `WithdrawSellerOffers` policy on `SellerSuspended`; an anti-corruption
consumption of catalogue events; customer-supplier towards Cart & Checkout.

### Head of Catalogue

"A product is one thing that can be sold, independent of who sells it. It has variants,
each with its own SKU, and the SKU is what everyone downstream uses. Some people say item,
some say listing; a listing to us is a seller's offer, so we correct that every time. A
product needs at least one variant or nothing can be offered against it. We publish when a
product is listed and when it's retired, with the SKUs in the message, and Search and
Offers both react. Our API is documented and versioned; anyone can call it."

Recorded as: Catalogue serving "Discovery"; Product aggregate with Variant `includes`;
invariants `AtLeastOneVariant` and `UniqueSkuWithinProduct`; published-language events
with schemas; CatalogueAPI as an open host; glossary entries for Product (aliases Item,
Listing) and SKU.

### Search product lead and Ads product lead (joint session)

Search: "The index is a copy, never the truth. We rebuild a document whenever the catalogue
or the buy box changes because we show the buy box price in results. We take those events
exactly as published; if the format changes we change with it."

Ads: "We run a second-price auction for the sponsored slots on every results page. Search
calls us for the slots and merges them into the organic results. Campaigns belong to
sellers, have a daily budget, and no bid may exceed it. When a seller is suspended their
campaigns pause the same moment."

Both: "We used to break each other. Now we plan the results page as one product and
release together. Neither of us changes it alone."

Recorded as: Search with a projection aggregate (SearchIndex), the Ranker domain service and
a conformist stance to Catalogue and Offers; Advertising with the Campaign aggregate,
`BidWithinBudget`, the AuctionService and the `PauseSellerCampaigns` policy; a partnership
between Search and Advertising, with Search consuming `GetSponsoredResults` as a conformist
because partners do not translate each other.

### Head of Seller Services

"A seller is a third party selling under its own name. They register, we run identity and
bank-account checks, and only when both pass do they become active. Trust & Safety can
flag a seller after activation and we suspend on their say-so, pending review. Vendors are
not sellers. That project was killed in 2015 and we are not reopening it."

Recorded as: Seller Onboarding as a supporting subdomain; SellerAccount with
VerificationCheck `includes` and `ActiveOnlyAfterChecks`; `SellerRegistered` internal, then
`SellerActivated` and `SellerSuspended` published; policies "Verify on registration" and
"Suspend flagged sellers"; separate ways with Vendor Purchasing.

### Checkout tech lead

"The cart is what a customer intends to buy: lines of offer and quantity. We cap it at fifty
lines because checkout times out beyond that. Checkout freezes the cart, asks Payments to
hold the money, and only when the hold succeeds do we tell Orders to create the order. If
the hold fails the customer sees an error and the cart stays open. We read offers through
the Offers API but keep our own line shape. There's also a wishlist that a growth squad
built last year; I honestly don't know how it's modelled."

Recorded as: Cart & Checkout serving "Ordering"; Cart aggregate with CartLine `includes`,
`LineQuantityAtLeastOne` and `MaxFiftyLines`; the CheckoutOrchestrator application service
consuming `AuthorisePayment` and `PlaceOrder` through anti-corruption layers; the two
policies that chain `CartCheckedOut` to `AuthorisePayment` and `PaymentAuthorised` to
`PlaceOrder`. The wishlist was modelled as found (see section 7).

### Orders Team lead

"The order is what the customer sees: the lines they bought, the shipments those lines went
out in, and any returns. We keep shipments on the order because the customer tracks by
order, not by warehouse box, and a return has to check what was actually shipped. Rules: the
total is the sum of the lines, a line is in at most one shipment, you can't return more than
was shipped, and you cancel only before anything ships; after that it's a return. The
warehouse tells us about dispatches and received returns, delivery tells us about
handovers, fraud tells us about flags, and each of those is an automatic reaction on our
side. We call Payments to refund once the warehouse has graded a return."

Recorded as: the Order aggregate with OrderLine, Shipment, Return and ReturnLine as
`includes`; four invariants; policies "Record dispatch", "Complete on delivery", "Refund on
received return" and "Cancel flagged orders"; anti-corruption consumptions of Warehouse,
Last Mile, Fraud and Payments; the glossary entries for Order, Shipment and Return.

### Payments engineering lead

"We hold the money at checkout and take it per shipment when it leaves the dock, so a
cancelled order costs the customer nothing. Captures can't exceed the authorisation, refunds
can't exceed the capture they're against, and everything on one payment is in one currency.
Our API is documented; Checkout is the main caller and they get consulted on changes. We
would buy this from a provider tomorrow if the provider's API were good enough; there's
nothing special about us."

Recorded as: Payments as a generic subdomain; the Payment aggregate with Authorisation,
Capture and Refund `includes`; three invariants; the open-host operations and
published-language events; the "Capture on dispatch" policy; customer-supplier with Cart &
Checkout.

### Trust & Safety lead

"We score orders after they're placed and sellers after they're activated, from events.
A score is 0 to 1000 with the signals that produced it; a flag without an explanation
is useless to an agent. We publish flags; Orders cancels, Seller Services suspends. We don't
sit in the checkout path and we don't want to."

Recorded as: Fraud as supporting; RiskAssessment with `ScoreExplained`; the RiskScorer domain
service with `ScoreOrder` and `ScoreSeller`; two policies; published flags consumed
downstream.

### Head of Fulfilment

"A fulfilment order is our view of a customer order: pick tasks, packages, a dispatch. We
never dispatch a package until every pick task in it is done. Stock lives as a position per
SKU per site, with reservations against it, and reserved can never exceed on hand; that
would be overselling. We translate customer orders into our own shape and we translate the
VPS export the same way. Nobody touches VPS's tables directly any more. The label, the
barcode and the scan events, is a shared library with Logistics; a label printed here is
scanned there, so the format has to be one thing."

Recorded as: Warehousing as a core subdomain; InventoryPosition with Reservation `includes`
and `ReservedWithinOnHand`; FulfilmentOrder with PickTask and Package `includes` and
`DispatchOnlyWhenPicked`; policies "Reserve on order", "Pick on reservation", "Book in vendor
deliveries" and "Expect requested returns"; anti-corruption layers towards Orders and Vendor
Purchasing; shared kernel with Last Mile.

### Warehouse shift lead (site 4, Rotherham)

"On hand is what's on the shelf, reserved or not. Available is on hand minus reserved. The
marketplace people say 'stock' and mean the number the seller typed in; that's not stock
until it's on my shelf. A package is a box with one label. Order means three things in this
building: the customer order, the purchase order from VPS, and our fulfilment order. We say
which one."

Recorded as: the glossary entries for On hand (alias Stock) and Package (alias Parcel), and
the language collisions in section 4.

### Logistics operations manager

"A route is a driver's day: up to 150 stops, each stop an address with however many packages
go there. We record delivery with proof: photo, signature or safe place. We read the
warehouse dispatch feed to put packages on tomorrow's routes. Do we conform to their format
or translate it? Honestly, both, depending on who wrote the code. We've never agreed."

Recorded as: Last Mile as supporting; DeliveryRoute with Stop `includes`, ProofOfDelivery,
`MaxStopsPerRoute`; the "Route dispatched packages" policy; and the consumption of
`ShipmentDispatched` left without a downstream role, on purpose (section 7).

### Customer Service operations manager

"A case is one customer problem tracked to an outcome; agents call them tickets. A case is
never resolved without at least one interaction. Failed deliveries open cases automatically
so we ring the customer before they ring us. We read orders through the Orders API and
raise returns through it. We also copied the order lines onto the case a few years ago so
agents could see them; it goes stale and we've had wrong refunds because of it."

Recorded as: Customer Service as supporting; the Case aggregate with Interaction `includes`,
Resolution and `ResolvedCaseHasInteraction`; the "Open case on failed delivery" policy;
anti-corruption consumptions of `GetOrder`, `RequestReturn` and `DeliveryAttemptFailed`;
and the copied order lines modelled as found (section 7).

### Retail Systems engineer (VPS)

"There's a purchase order table and about ninety jobs. The one that matters is the nightly
export of received vendor stock, which every site reads. I can describe the export; I can't
describe the rest."

Recorded as: Vendor Purchasing (legacy) flagged as a big ball of mud with one aggregate and
one published event, `PurchaseOrderReceived`, with the export's shape as its schema.

### Platform Team lead

"Identity is accounts and sign-in. We expose a documented API and everybody takes it as it
is. Nothing special."

Recorded as: Identity as generic; IdentityAPI with `RegisterCustomer` and `GetCustomer`;
conformist consumptions from Checkout and Customer Service.

## 3. Event storming

A half-day session with one person from each team, working left to right along a wall.
Orange stickies were events, blue were commands, purple were policies, and a pink sticky
marked every place two people disagreed about a word. The main timeline, condensed:

| Event | Raised by | Reacted to by |
|---|---|---|
| ProductListed | ListProduct (Catalogue) | Search indexes; Offers adds SKU |
| SellerRegistered (internal) | RegisterSeller | Verify on registration |
| SellerActivated | VerifySeller | Offers allows publishing; Fraud scores seller |
| OfferPublished / OfferWithdrawn | PublishOffer / WithdrawSellerOffers | Recompute buy box |
| BuyBoxAwarded | AwardBuyBox | Search reindexes price |
| CartCheckedOut | Checkout | Authorise on checkout |
| PaymentAuthorised / PaymentDeclined | AuthorisePayment | Place order on authorisation |
| OrderPlaced | PlaceOrder | Warehouse reserves; Fraud scores order |
| OrderRiskFlagged | ScoreOrder | Cancel flagged orders |
| StockReserved / StockShort | ReserveStock | Pick on reservation |
| ShipmentDispatched | Dispatch | Orders records shipment; Payments captures; Last Mile routes |
| ParcelDelivered / DeliveryAttemptFailed | RecordDelivery | Orders completes; CS opens case |
| ReturnRequested | RequestReturn | Warehouse expects return |
| ReturnReceived | ReceiveReturn | Refund on received return |
| RefundIssued | RefundPayment | (customer notified, out of scope) |
| SellerRiskFlagged | ScoreSeller | Suspend flagged sellers |
| SellerSuspended | SuspendSeller | Offers withdrawn; Ads paused |
| PurchaseOrderReceived | VPS nightly batch | Book in vendor deliveries |

Every row is a `provides` with `raises` and, where a reaction is automatic, a policy in the
reacting context. Events that other contexts react to carry a schema; events that only their
own context uses are `internal`.

## 4. Language collisions

Pink stickies from the wall, each of which became a context boundary or a glossary entry:

- **Order.** Customer order (Orders), purchase order (Vendor Purchasing), fulfilment order
  (Warehouse). Three contexts, three aggregates; the warehouse's `FulfilmentOrder`
  `references` the customer `Order` by identity only.
- **Shipment / Package / Parcel.** Orders says shipment and means the customer-visible
  group of lines; Warehouse says package and means a box with a label; Logistics says
  parcel and means the thing at a stop. Modelled as three entities in three aggregates, with
  aliases in each glossary rather than one shared word.
- **Stock.** On hand (Warehouse) versus a seller's typed available quantity (Offers).
  Kept apart; the warehouse glossary records "Stock" only as an alias of On hand.
- **Listing / Item / Product.** Catalogue owns Product; Listing means an offer to sellers.
  Recorded as aliases on the Catalogue's Product term so the correction is visible.
- **Seller / Vendor.** Different businesses; separate ways.
- **Customer.** Identity's account versus the case's customer versus the order's customer.
  Only Identity holds the record; the others carry the id.

## 5. Classification

| Subdomain | Type | Reasoning from the interviews |
|---|---|---|
| Discovery | core | "Customers come to us first because we usually have the thing"; the results page is where the money is made |
| Offers & Buy Box | core | The most-argued-about logic in the company; decides who wins the sale |
| Warehousing | core | The network is what makes next-day the default; sellers pay to be in it |
| Sponsored Products | core | A margin the rest of the business cannot match |
| Ordering | supporting | Essential, well understood, no one claimed it as a differentiator |
| Seller Onboarding | supporting | Regulated and necessary; "checks are checks" |
| Last Mile | supporting | Carriers could do it; RiverMart does it to control the experience |
| Vendor Purchasing | supporting | Needed for first-party stock; nobody wants to invest in it |
| Fraud | supporting | Vendors exist, but the marketplace signals are RiverMart's own |
| Customer Service | supporting | Necessary; measured on cost |
| Payments | generic | "We would buy this tomorrow" |
| Identity | generic | "Nothing special" |

## 6. The context map

Relationship types were chosen from the playbook's questions: who depends on whom, does the
downstream get a say, do they release together, do they share code, have they decided never
to integrate.

- **Customer-supplier** where the downstream team said it is consulted before the upstream
  changes: Cart & Checkout towards Offers, Payments and Orders; Customer Service towards
  Orders.
- **Upstream-downstream** everywhere else a context consumes another's events or API, with
  the roles as each side described its stance: published language on the events, open host
  on the documented APIs, conformist where the downstream "takes it as published",
  anti-corruption layer where it "keeps its own shape".
- **Shared kernel** between Warehouse and Last Mile: the label library is one codebase both
  teams change. Each context still has its own `TrackingLabel` value object in the model,
  with the description saying it is the shared one, because a value object belongs to an
  aggregate.
- **Partnership** between Search and Advertising: one results page, one planning cycle, a
  joint release calendar.
- **Separate ways** between Vendor Purchasing and Seller Onboarding: decided policy since
  2015.
- Fraud and Orders, and Fraud and Seller Onboarding, are upstream of each other in both
  directions (facts one way, verdicts the other). We kept both directed relationships rather
  than inventing a partnership that neither team recognised.

## 7. Validation and what we left in

Running `validate()` on the finished model gives three diagnostics. Each corresponds to a
real finding, and the client asked that they stay in the model so the owning team sees them:

- `aggregate-root` on the Wishlist: the growth squad marked both Wishlist and WishlistItem
  as roots. The fix is to make the item a child; that is the Checkout Team's call.
- `cross-aggregate-reference` on Case: the case system `includes` order lines that belong to
  the Order aggregate. This is the stale-lines problem behind the wrong refunds. The fix is
  to hold the line ids and read through the Orders API.
- `role-coherence` on Last Mile's consumption of `ShipmentDispatched`: no downstream role,
  because the two teams have never agreed one. The relationship is declared with only the
  upstream role, which is the honest state.

## 8. What the model leaves out

Deliberately not modelled, either because it is infrastructure or because no interview
reached it: tax calculation, customer notifications (email, push), the membership programme,
pricing automation for first-party stock, product reviews and questions, gift cards and
promotions, returns transport, carrier integrations beyond RiverMart's own stations, data
warehousing and analytics, and everything inside Vendor Purchasing beyond its export. Each
would be a further discovery session with its own owner.
