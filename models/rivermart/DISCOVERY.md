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
customer for reads and they get a say when we change the offer API. Our own retail arm is
just another seller in our tables; it wins the buy box on the same rules or it doesn't. The
delivery promise on an offer comes from whether the stock is in one of our warehouses, and
the seller rating is a score we keep ourselves."

Recorded as: the Offers context serving the core "Offers & Buy Box" subdomain; the Offer
aggregate with `fulfilledByRiverMart` and `sellerRating` beside price, `PricePositive` and
`OneActiveOfferPerSellerSku` (a uniqueness rule the context holds and `PublishOffer`
keeps, since one offer cannot see another); the BuyBoxService domain service; the `WithdrawSellerOffers`
policy on `SellerSuspended`; an anti-corruption consumption of catalogue events;
customer-supplier towards Cart & Checkout. First-party retail is a seller id in Offers, not
a context of its own.

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
calls us for the slots and merges them into the organic results, and tells us when one of
them is clicked; the click is what the seller pays for, never the impression. Campaigns
belong to sellers, have a daily budget, and no bid may exceed it. When a seller is suspended
their campaigns pause the same moment."

Both: "We used to break each other. Now we plan the results page as one product and
release together. Neither of us changes it alone."

Recorded as: Search with SearchAPI as its query service — a projection is a service that
provides a query operation, not an aggregate with an invented root (decision 15) — the
Ranker domain service and a conformist stance to Catalogue and Offers; Advertising with the
Campaign aggregate,
`BidWithinBudget`, the AuctionService (which awards slots and charges nothing) and
`RecordAdClick`, the open-host operation the results page calls, which is what raises
`AdClicked`; the `PauseSellerCampaigns` policy; a partnership between Search and
Advertising, with Search consuming `GetSponsoredResults` and `RecordAdClick` as a
conformist because partners do not translate each other.

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
consuming `AuthorisePayment` and `PlaceOrder` through anti-corruption layers; the
"Checkout" process, which starts on `CartCheckedOut`, asks for the hold and waits, places
the order on `PaymentAuthorised` and reopens the cart on `PaymentDeclined` ("the cart stays
open"), ending on `OrderPlaced`. It was three chained policies until card 60, none of which
could say that the checkout was waiting for an answer. The wishlist was modelled as found
(see section 7).

### Orders Team lead

"The order is what the customer sees: the lines they bought, the shipments those lines went
out in, and any returns. We keep shipments on the order because the customer tracks by
order, not by warehouse box, and a return has to check what was actually shipped. Rules: the
total is the sum of the lines, a line is in at most one shipment, you can't return more than
was shipped, and you cancel only before anything ships; after that it's a return. The
warehouse tells us about dispatches and received returns, delivery tells us about
handovers, fraud tells us about flags, and each of those is an automatic reaction on our
side. If the warehouse can't cover an order we hold it as awaiting stock rather than let it
sit as placed forever; the customer sees that. We call Payments to refund once the
warehouse has graded a return."

Recorded as: the Order aggregate with OrderLine, Shipment, Return and ReturnLine as
`includes`; four invariants; the "Order to delivery" process, which starts on
`OrderPlaced`, waits for the warehouse and the last mile, records dispatches, holds the
order when stock is short, completes it when the last parcel is handed over and ends on
`OrderCompleted` or `OrderCancelled` (card 60: it was three policies that between them
could not say when the order was done); policies "Refund on received return" and
"Cancel flagged orders"; anti-corruption
consumptions of Warehouse, Last Mile, Fraud and Payments; the glossary entries for Order,
Shipment and Return. Orders is downstream of Payments for the refund call and of Offers for
the offer id each line carries; both are on the map. `CancelOrder` rejects with
`CancelRefused` once a shipment has left the dock: nothing was cancelled, and the storefront
is told which shipment blocked it so it can offer a return instead.

### Payments engineering lead

"We hold the money at checkout and take it per shipment when it leaves the dock, so a
cancelled order costs the customer nothing. Captures can't exceed the authorisation, refunds
can't exceed the capture they're against, and everything on one payment is in one currency.
Our API is documented; Checkout is the main caller and they get consulted on changes. We
would buy this from a provider tomorrow if the provider's API were good enough; there's
nothing special about us."

Recorded as: Payments as a generic subdomain; the Payment aggregate with Authorisation,
Capture and Refund `includes`; three invariants; the open-host operations and
published-language events; the "Capture on dispatch" policy and "Attach order to payment",
because the hold is taken against a cart and the order id only exists afterwards;
customer-supplier with Cart & Checkout.

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
VPS export the same way. Nobody touches VPS's tables directly any more. When Orders cancels,
fraud or customer, we give the reservation back and void the pick tasks the same minute;
that is the guarantee we asked for, that a flagged order is never picked. A pick task is
pending until the picker scans it, and a package knows which tasks went into it. The label,
the barcode and the scan events, is a shared library with Logistics; a label printed here is
scanned there, so the format has to be one thing."

Recorded as: Warehousing as a core subdomain; InventoryPosition with Reservation `includes`
and `ReservedWithinOnHand`; FulfilmentOrder with PickTask (with a status) and Package
`includes`, Package referencing the tasks packed into it, and `DispatchOnlyWhenPicked` over
the two; policies "Reserve on order", "Pick on reservation", "Release on cancellation", "Book
in vendor deliveries" and "Expect requested returns"; anti-corruption layers towards Orders
and Vendor Purchasing; shared kernel with Last Mile; the glossary entry "Fulfilment order".

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

Recorded as: Last Mile as supporting; DeliveryRoute with Stop and Parcel `includes`,
ProofOfDelivery, `MaxStopsPerRoute`; the "Route dispatched packages" policy; the glossary
entry "Parcel"; and the consumption of `ShipmentDispatched` left without a downstream role,
on purpose (section 7).

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
one published event, `PurchaseOrderReceived`, with the export's shape as its schema; a
"Purchase order" glossary entry, and a "Vendor" entry in Seller Onboarding that says what a
vendor is not.

### Platform Team lead

"Identity is accounts and sign-in. We expose a documented API and everybody takes it as it
is. Nothing special."

Recorded as: Identity as generic; IdentityAPI with `RegisterCustomer` and `GetCustomer`;
conformist consumptions from Checkout and Customer Service; the "Customer" glossary entry
that says only this context holds the record.

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
| PaymentAuthorised | AuthorisePayment | Checkout places the order |
| PaymentDeclined (an answer, not an event) | AuthorisePayment rejects with it | Checkout reopens the cart |
| AuthorisationExpired | ExpireAuthorisations | Checkout ends: nobody came back |
| OrderPlaced | PlaceOrder | Warehouse reserves; Fraud scores order; Payments attaches the order id |
| OrderRiskFlagged | ScoreOrder | Cancel flagged orders |
| OrderCancelled | CancelOrder | Warehouse releases the reservation and voids pick tasks |
| StockReserved / StockShort | ReserveStock | Pick on reservation / Orders holds as awaiting-stock |
| SlotsAwarded (internal) / AdClicked | RunAuction / RecordAdClick (Search reports the click) | Budget spend, inside Advertising |
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

The wall was not this tidy. The table is the happy path; the red hotspot stickies, each of
which is now somewhere in the model, were:

- A payment declined after the cart was frozen (Checkout: "the cart stays open"; the decline is
  what `AuthorisePayment` rejects with and the Checkout process waits on it, card 92).
- No site able to reserve for an order (Warehouse: "it waits or is split"; now `StockShort`
  puts the order into awaiting-stock in Orders).
- A fraud flag arriving after the warehouse had already reserved (Fulfilment and Trust &
  Safety disagreed on who guaranteed no pick; now `OrderCancelled` releases and voids).
- Order lines copied onto cases (Customer Service; left in as the deliberate
  `cross-aggregate-reference`, section 7).
- Who translates the dispatch feed (Logistics; still unagreed, and the relationship says so,
  section 7).
- Charging on impression versus on click (Ads and Search; the auction awards, the click pays).

## 4. Language collisions

Pink stickies from the wall, each of which became a context boundary or a glossary entry:

- **Order.** Customer order (Orders), purchase order (Vendor Purchasing), fulfilment order
  (Warehouse). Three contexts, three aggregates; the warehouse's `FulfilmentOrder` holds the
  customer `Order`'s identity in an `orderId` attribute, since decision 14 a relation never
  crosses a context.
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
  Only Identity holds the record; the others carry the id. A "Customer" entry in Identity's
  glossary says so.
- **Parcel.** Now an entity in Last Mile, so the three words are three entities as claimed.

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
  teams change. `TrackingLabel` is declared once, in Warehouse, and Last Mile's `Parcel`
  types its label by that same value object: a shared kernel is the one relationship over
  which a value object may be borrowed (decision 16), so the model holds one definition
  where the library holds one file. It used to be declared twice, once in each context, with
  each description claiming it was the shared one; two definitions that must not drift is
  what the kernel exists to avoid, and card 89 removed the copy.
- **Partnership** between Search and Advertising: one results page, one planning cycle, a
  joint release calendar.
- **Separate ways** between Vendor Purchasing and Seller Onboarding: decided policy since
  2015.
- Fraud and Orders, and Fraud and Seller Onboarding, are upstream of each other in both
  directions (facts one way, verdicts the other). We kept both directed relationships rather
  than inventing a partnership that neither team recognised. Orders and Payments are the same
  shape: the order id goes to Payments on `OrderPlaced`, refunds come back through the
  payments API.
- Every cross-context identity has a relationship on the map: Orders to Offers (the offer
  id on a line) and Advertising to Catalogue (the product id an ad group advertises), both
  conformist because only an id crosses; since decision 14 the relation stays inside its
  own context and the identity attribute is what carries the dependency.

## 7. Validation and what we left in

Running `validate()` on the finished model gives two diagnostics. Each corresponds to a
real finding, and the client asked that they stay in the model so the owning team sees them:

- `aggregate-root` on the Wishlist: the growth squad marked both Wishlist and WishlistItem
  as roots. The fix is to make the item a child; that is the Checkout Team's call.
- `cross-aggregate-reference` on Case: the case system `includes` order lines that belong to
  the Order aggregate. This is the stale-lines problem behind the wrong refunds. The fix is
  to hold the line ids and read through the Orders API.

The partnership between Search and Advertising used to raise `partnership-backed` as a third
finding. The two teams call the results page one product and release it together, but every
dependency runs one way — Search calls `GetSponsoredResults` and reports clicks through
`RecordAdClick`, and Advertising consumes nothing of Search's. The declaration is true: a
partnership in DDD is two teams whose success is mutual and whose releases are planned as
one, which is exactly the results page, and it does not require consumption in both
directions. Decision 20's second amendment relaxed the rule to traffic in at least one
direction; the model is unchanged and the diagnostic is gone.

Last Mile's consumption of `ShipmentDispatched` still declares no downstream role, because
the two teams have never agreed one. That used to raise `role-coherence`; card 47 found the
rule right to stay quiet, since Warehouse and Last Mile share a kernel and neither end is
upstream of the other, so there is no role for either to declare. The model is unchanged and
the diagnostic is gone.

## 8. What the model leaves out

Deliberately not modelled, either because it is infrastructure or because no interview
reached it: tax calculation, customer notifications (email, push), the membership programme,
pricing automation for first-party stock, product reviews and questions, gift cards and
promotions, returns transport, carrier integrations beyond RiverMart's own stations, data
warehousing and analytics, seller settlement (commission, payouts and their reconciliation,
which sits with Finance Technology and was not interviewed), seller ratings and the reviews
that feed them, and everything inside Vendor Purchasing beyond its export. Each would be a
further discovery session with its own owner.

## 9. Peer review

An independent review of the model was taken as a second opinion after the first draft.
Each finding is listed with the outcome, the reason, and what changed. The three deliberate
diagnostics of section 7 are untouched and `validate()` still returns exactly them.

Accepted

- Warehouse ignored `OrderCancelled`, so a flagged order reserved a moment earlier would
  still be picked, against the guarantee in the brief. Changed: InventoryPosition and
  FulfilmentOrder consume `OrderCancelled`; the policy "Release on cancellation" issues
  `ReleaseReservation` and `VoidPickTasks`. The Head of Fulfilment interview now says so.
- `StockShort` was raised and consumed by nobody, leaving an order in limbo. Changed: Orders
  consumes it, "Hold on stock short" issues `HoldForStock`, and `OrderStatus` gains
  `awaiting-stock`; the Orders Team lead interview and the event table were updated.
- `PaymentDeclined` was raised and never handled although the Checkout lead said "the cart
  stays open". Changed: CheckoutOrchestrator consumes it and "Reopen cart on decline"
  issues `ReopenCart`.
- `RunAuction` raised `AdClicked`, which charged sellers on impression. Changed: the auction
  raises the internal `SlotsAwarded`; `RecordAdClick` on AdsAPI, called by Search's results
  page, is what raises `AdClicked`. The Ads interview now says the click is what is paid for.
- Orders issued `RefundPayment` with no Orders–Payments relationship on the map. Changed:
  Orders is downstream of Payments (open host, ACL).
- `OrderLine references Offer` and `AdGroup references Product` crossed contexts with no
  relationship declared. Changed: Orders downstream of Offers and Advertising downstream of
  Catalogue, both conformist because only an id crosses; AdsAPI consumes `GetProduct`.
- `DispatchOnlyWhenPicked` could not be evaluated: PickTask had no status and Package did
  not know its tasks. Changed: `PickTask.status` (pending, picked, voided), Package
  `references` the tasks packed into it, and the invariant constrains both.
- `PaymentIntent.orderId` had no way to be filled, since the hold precedes the order.
  Changed: Payments consumes `OrderPlaced` and "Attach order to payment" issues
  `AttachOrder`; Payments is downstream of Orders on the map.
- `primeEligible` on SearchDocument was another company's word for a programme the record
  leaves out. Changed: `nextDayEligible`, described as the badge the brief talks about.
- The warehouse's three meanings of "order" had one glossary entry. Changed: "Fulfilment
  order" in Warehouse and "Purchase order" in Vendor Purchasing.
- Section 4 said "parcel" was an entity in Last Mile; it was not. Changed: a `Parcel` entity
  under Stop carrying the label and order id, and a "Parcel" glossary entry.
- Section 4 said only Identity holds the customer record; Identity had no glossary. Changed:
  a "Customer" entry in Identity.
- "Vendor" was absent from Seller Onboarding's language although the separation is the
  most settled policy in the company. Changed: a "Vendor" entry that says what it is not.

Partially accepted

- The buy box inputs the Head of Marketplace named (delivery promise, seller rating) had no
  element. Changed: `fulfilledByRiverMart` and `sellerRating` on Offer, with the source of
  the rating (reviews) named in section 8 as out of scope; no rating context was invented.
- First-party retail had no place in Offers. Accepted that it needed saying, not that it
  needs a context: RiverMart's retail arm is a seller id in Offers, now stated on the
  aggregate, the glossary and in the interview.
- `OneActiveOfferPerSellerSku` cannot be enforced by one Offer instance. Since decision 27
  a bounded context may hold an invariant across its instances, guarded by an operation
  that checks it before acting; the rule moves to the Offers context, constraining the
  (sellerId, sku) pair and naming `PublishOffer`, which checks the seller's existing offers,
  as its guard.
- The event storming table was a sterile happy path. Changed: the hotspots from the wall are
  listed under it, and the failure rows (decline, stock short, cancellation, click) added.
  The half-day session stands; the table was always described as condensed.
- No settlement, commission or tax stakeholder was interviewed. True; section 8 now names
  seller settlement as a gap with its owner rather than leaving it implicit. Modelling it
  is a further engagement, not a fix to this one.

Rejected

- Customer-supplier with open-host-service and an anti-corruption layer is a confusion: the
  upstream role says how the API is offered, the downstream role whether it is translated,
  and the relationship type whether the downstream is consulted. They are three independent
  answers to the playbook's questions and each context gave them.
- Partnership contradicted by a conformist consumption: in ODS the downstream role on a
  consumption is only the translate-or-not stance; "take it as-is" inside a partnership is
  the honest one and the type carries the symmetry.
- Wishlist belongs outside Cart & Checkout: it is the deliberate `aggregate-root` case,
  modelled as found in the Checkout Team's system; where it goes is that team's call.
- Order is a god aggregate: the Orders Team lead gave the reason (a return must check what
  was shipped; the customer tracks by order) and the brief asked us to settle what a
  shipment is. Contention is per order, not global, and was not raised by the team.
- The interviews read like a textbook: the quoted speech is plain ("we take it as
  published", "nothing special about us"); the DDD terms appear only in the "Recorded as"
  lines, which is where they belong.

## 10. Revision (card 71): the payment provider becomes an external context

The Payments pages already spoke of somebody who was not in the model: Authorisation is "the
provider's hold on the customer's funds" and `PaymentDeclined` is "the provider refused". The
provider itself appeared nowhere, so the map showed RiverMart holding and taking money by
itself. Decision 28 gives it a place: **Payment Provider**, a bounded context with
`external: true` — no subdomain, no team, no aggregates, because the acquirer's insides are
not RiverMart's to state — with one service offering `HoldFunds`, `TakeFunds` and
`ReturnFunds` in its own wire format. Payments consumes all three through an anti-corruption
layer, made by `AuthorisePayment`, `CapturePayment` and `RefundPayment` respectively, and the
map carries one upstream-downstream relationship: open host upstream, anti-corruption layer
downstream. That is the shape the Payments lead described, "we would buy this from a provider
tomorrow if the provider's API were good enough" — RiverMart keeps its own intent, capture
and refund and translates at the edge.

Card 71 also added `event-unraised`, a warning about an event no operation of its context
raises. RiverMart had one: Vendor Purchasing's `PurchaseOrderReceived`, which the Warehouse
reads and which nothing in the model caused. The Retail Systems engineer named the cause in
the interview — "the nightly export of received vendor stock" — so the model named the job:
a `NightlyExport` service with one internal operation, `RunNightlyExport`, raising the
event. The two deliberate diagnostics of section 7 are untouched.

## Revision (card 90): the export job comes back out

The engineer's exact words were "I can describe the export; I can't describe the rest", and
the service the model built from them called itself "the one job of the ninety that anyone
can describe". Ninety jobs nobody can read is what `bigBallOfMud` means, and inventing one
service so a rule had something to point at claimed a shape of the inside that nobody at
RiverMart could confirm. A big ball of mud is now exempt from `event-unraised`, as an
external context is (decision 28's second amendment), so `NightlyExport` and
`RunNightlyExport` are gone. Vendor Purchasing keeps the aggregate, the event and the
export's shape: it says what it emits and not how, which is all anyone knows.

Two other things came out of the same card. `Cart & Checkout` was declared upstream of
`Payments` with no roles, for the cart id that `PaymentAuthorised` and `AuthorisePayment`
carry — "so checkout can match it back", as its own description said. An id echoed in a
payload is not a dependency: Payments stores no cart and asks Checkout for nothing
(decision 14's second amendment), so that relationship is gone and the customer-supplier
one that runs the other way is the whole of the pair. And every cross-context call that
could name its caller now does: `SearchAPI` gained `ReportAdClick`, the operation the Ads
interview described as "Search tells us when one of them is clicked" and which the model had
never named, so the consumption of `RecordAdClick` no longer reads as the whole of Search
calling out. `CaseAPI`'s consumption of `RequestReturn` stays without a caller on purpose:
an agent raises a return while resolving a case, and `ResolveCase` is the Case aggregate's
operation, not CaseAPI's to name.

## Optionality against cardinality (card 82)

`attribute-relation-coherence` now reads an attribute's `optional` against its relation's
cardinality. `Product.brand` and `Shipment.tracking` were required beside relations of
`0..1`; own-label goods carry no brand and a shipment has no carrier reference until the
carrier gives one, so both attributes are optional and the two halves agree.

## Revision (card 92): the decline is an answer, and a hold that expires ends the checkout

The Checkout tech lead described one call and two outcomes — "we ask Payments to hold the
money, and only when the hold succeeds do we tell Orders to create the order. If the hold
fails the customer sees an error and the cart stays open" — and the model published the
failure as `PaymentDeclined`, an event with a published language, against decision 25's own
example. Nothing happened when a hold was declined; a call came back refused, and the only
party who hears it is the caller who asked. `AuthorisePayment` now **rejects with**
`PaymentDeclined`, a schema of Payments carrying the payment id and the reason the storefront
shows, and the Checkout process waits on that answer (decision 23's second amendment). The
consumption of the event is gone with it: the answer arrives down the `AuthorisePayment`
call the orchestrator already declares, which is what makes it Checkout's to hear.

The same interview left a question the model had never answered: what finishes a checkout
nobody comes back to? Its own description said the instance "stays open with the cart",
which is a process that never ends. The Payments lead and the Authorisation glossary entry
both say what really happens — a hold "expires if not captured", and `Authorisation` has
carried `expiresAt` since the first draft. So Payments' application service gains
`ExpireAuthorisations`, which a scheduler runs every few minutes and which raises
`AuthorisationExpired` for every hold past its expiry. Nothing in the model consumes the
operation, which is what an operation called from outside the software looks like
(decision 28); the released hold is a published fact, and the Checkout process ends on it.
A cart nobody returns to is still the customer's to abandon: what ends is the checkout, not
the cart.

The deliberate diagnostics of section 7 are untouched.
