# RiverMart: client brief

Onboarding pack for the domain modelling engagement. Everything here was gathered from the
kick-off with the CTO office and the operations directors before any interviews took place;
the discovery record (`DISCOVERY.md`) says what we found once we started talking to teams.
RiverMart is fictional; any resemblance to a real retailer is the point, not an accident.

## Who they are

RiverMart started in 2006 as a discount electronics reseller working out of a unit on an
industrial estate outside Leeds. It sold other people's surplus stock cheaply and shipped it
fast, and it kept doing exactly that as it grew. In 2011 it opened its catalogue to
third-party sellers; in 2014 it built its first own-run warehouse; in 2017 it started
selling advertising to the sellers on its pages. Today it is the second-largest online
general retailer in its home market.

- 14,200 employees, roughly 9,000 of them in nine fulfilment centres and the delivery
  stations that hang off them.
- 38,000 active third-party sellers, who account for 58% of units sold.
- Gross merchandise value last year of 6.1 billion; advertising revenue of 410 million at a
  margin the rest of the business cannot match.
- 1,100 people in product and engineering, organised into about seventy teams.

## What they do

RiverMart runs a marketplace with its own retail arm inside it. A customer searches, sees a
page for a product with one default "buy box" offer and a list of alternatives, adds to a
cart, checks out, and gets a parcel, usually the next day. Behind that:

- **First-party retail** buys stock from wholesale vendors and sells it under RiverMart's
  name. It is the older, smaller, and less profitable half of unit sales.
- **The marketplace** lets sellers list offers against catalogue products, and for a fee
  store their stock in RiverMart's warehouses so it qualifies for next-day delivery.
- **Fulfilment** holds stock in nine sites, picks, packs and dispatches, and RiverMart's own
  delivery stations do the last mile in the big cities; carriers cover the rest.
- **Advertising** sells sponsored slots on search results pages to sellers, by auction.
- **Customer service** handles about 90,000 contacts a week, most of them about deliveries.

## What makes them different

The management view, which the interviews later confirmed with more nuance, is that three
things set RiverMart apart, and they reinforce each other:

1. **Selection.** Because sellers list against a shared catalogue, one product page shows
   every offer. Customers come to RiverMart first because it usually has the thing.
2. **Speed.** The warehouse network and the delivery stations make next-day delivery the
   default rather than the upgrade. Sellers put stock in RiverMart's warehouses to get the
   badge, which feeds selection.
3. **Advertising margin.** With that traffic, sponsored slots sell themselves. The auction
   and the ranking of the results page are where the profit is made, and the CFO watches
   that page more closely than any other.

The buy box, the decision about which offer a customer gets by default, sits at the centre.
It decides who wins the sale, it drives seller behaviour on price and on putting stock in
the warehouses, and it is the most-argued-about piece of logic in the company.

## Where the challenges are

**Vendor Purchasing (VPS).** The system that orders first-party stock from vendors dates
from 2009. It is a batch application over a shared database that the warehouse systems also
read, with nightly jobs that nobody has changed since the last person who understood them
left in 2019. Every fulfilment centre depends on its nightly export to know what vendor
stock is arriving. Retail Systems, a team of four, keeps it running. Nobody wants to model
it in detail; everyone needs to know where its edges are.

**Vendors versus sellers.** Ten years ago there was a project to unify vendor and seller
accounts. It failed: the contracts, the tax treatment and the commercial relationships are
different, and the sellers' team refused to inherit VPS's data. Management now treats this
as settled policy: the two are separate businesses and will not integrate.

**Search and Ads.** The Discovery team owns organic ranking; the Ads team owns the auction.
Both change the same results page, and for two years they broke each other's experiments
until the CPO put them in one planning cycle with a joint release calendar. They still
belong to different directors.

**Last mile.** The delivery stations were bought as a company in 2020 and their systems
were bolted on. The Logistics team reads the warehouse's dispatch feed but has never agreed
with Fulfilment whether it adopts the warehouse's message format or translates it; today it
does a bit of both, and every format change is a surprise.

**Warehouse and delivery labels.** The one thing the two did agree on is the label: the
barcode and the scan-event vocabulary are one shared library, changed by both teams.

**Customer service tooling.** The case system was built quickly in 2018. Agents wanted to
see order lines on the case screen, so the team copied the lines into the case. Order
changes now show up late or not at all on cases, and it is a regular source of wrong
refunds.

**Fraud latency.** Trust & Safety scores orders and sellers from events, after the fact.
The business accepts a small number of flagged orders being cancelled after payment rather
than slowing checkout with a synchronous check. The warehouse wants a guarantee it never
picks a flagged order.

**Scale.** Search indexes 40 million documents; the buy box is recomputed 30 million times
a day; peak checkout runs at 1,800 orders a minute. None of this is the modelling
engagement's problem, but it explains why every team is protective of its boundaries.

## The teams

RiverMart's product and engineering organisation is arranged by business area, with a
director per area and stream-aligned teams beneath. The teams we were pointed at:

| Team | Director | Looks after |
|---|---|---|
| Catalogue Team | Shopping | Product records, variants, data quality |
| Discovery Team | Shopping | Search index and ranking |
| Checkout Team | Shopping | Cart and the checkout flow |
| Orders Team | Shopping | The order record, returns, order history |
| Marketplace Team | Marketplace | Offers and the buy box |
| Seller Services Team | Marketplace | Seller registration, verification, suspension |
| Ads Team | Advertising | Campaigns and the sponsored auction |
| Payments Team | Finance Technology | Payment provider integration |
| Trust & Safety Team | Finance Technology | Fraud scoring for orders and sellers |
| Fulfilment Team | Operations Technology | Warehouse management systems |
| Logistics Team | Operations Technology | Routing and delivery station systems |
| Retail Systems Team | Operations Technology | VPS and other legacy retail systems |
| Customer Service Team | Customer Experience | The case system used by agents |
| Platform Team | Platform | Identity and shared services |

Teams own their systems end to end. There is no central architecture group; the CTO office
runs a monthly review where teams present integration changes, which is where most of the
friction above surfaces.

## What they asked for

A model of the whole business at the level of contexts and their relationships, detailed
enough inside each context to settle the recurring arguments (what a "shipment" is, who
owns the label, what the case system is allowed to hold), and honest about the legacy edge.
They asked that known problems be left in the model rather than tidied away, so that the
validation tooling shows them to the teams that own them.
