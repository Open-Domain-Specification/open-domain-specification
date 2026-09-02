# NorthBank: client brief

Onboarding pack for the domain modelling engagement, assembled from the kick-off with the
Chief Operating Officer, the Chief Risk Officer and the Head of Architecture before the
interviews began. The discovery record (`DISCOVERY.md`) says what the teams told us
afterwards. NorthBank is fictional, as is every scheme, regulator and vendor named here.

## Who they are

NorthBank was founded in 1874 as the Northern Counties Savings Bank in Newcastle, a mutual
that took deposits from shipyard and mining families. It demutualised in 1997, bought a
small mortgage lender in 2003, and came through the 2008 crisis without state support,
which it still mentions in every annual report. It is a mid-sized retail bank: big enough to
be systemically supervised, small enough that most of its staff know which branch they
started in.

- 5.8 million customers, 310 branches, two contact centres, 11,000 employees.
- A balance sheet of 92 billion: current accounts, savings, personal loans, mortgages,
  credit and debit cards.
- 1,900 people in technology and change, half of them contractors.
- Supervised by the Prudential Conduct Authority (PCA); subject to the Payment Services
  Order, the Data Protection Act, the Fair Treatment Rules introduced in 2023, and the
  operational resilience regime that requires every important business service to have a
  tested impact tolerance.

## What they do

A customer opens an account after identity and sanctions checks, gets a card and access to
online banking, pays people and gets paid, borrows, and talks to the bank in a branch or on
the phone when something goes wrong. Behind that:

- **Customer onboarding and KYC** verifies who someone is and records what they have
  consented to.
- **Accounts** are the products: current and savings accounts, with mandates saying who
  can operate them and what overdraft they have.
- **The ledger** is where money actually moves: double-entry journal entries, every one
  balanced, none ever changed.
- **Payments** take an instruction from a customer and get it to a payee through a scheme:
  the Rapid Payments Scheme for instant transfers, the Batch Clearing Scheme for standing
  orders and direct debits.
- **Cards** are issued by NorthBank and processed by CardCo, an outsourced processor that
  sends authorisation requests to the bank in real time.
- **Lending** originates personal loans and mortgages; **credit decisioning** says yes or no.
- **Fraud** scores every payment and card transaction and opens cases.
- **Regulatory reporting** assembles the returns the PCA requires every month and quarter.
- **Branches and the contact centre** serve customers face to face and by phone.

## What makes them different

The executive view, stated carefully because the CRO was in the room:

1. **Credit judgement.** NorthBank's loss rate on unsecured lending has been below the
   market's for fifteen years. The decisioning models and the affordability rules are the
   bank's own, tuned to its customer base, and the Credit Risk team is the best-paid team in
   technology.
2. **The account itself.** The current account is the relationship. Its rules (overdraft,
   mandates, freezing, closure) are where the bank's promises to customers are kept, and
   where the Fair Treatment Rules bite hardest.
3. **Fraud losses.** Since the reimbursement rules for authorised push payment scams came in,
   fraud detection is a direct line to the bottom line. The transaction scorer is the bank's
   own model.

Nobody claimed the ledger, payments rails, cards processing, sanctions lists, regulatory
returns or identity as differentiators. The ledger must be perfect; it is not unique.

## Where the challenges are

**Sovereign.** The core banking system, written in COBOL in 1989 and called Sovereign, still
holds every savings account and runs the nightly batch that posts the day's transactions.
The new ledger and account platform, built from 2019, has taken current accounts off it, but
savings remain, and the nightly batch file is still how the ledger learns about them.
Nobody under fifty can read the batch jobs. The bank has decided to hollow it out rather
than replace it, and it wants the model to show exactly where its edges are.

**Consent.** Under the Data Protection Act and the open banking rules, consent has a
purpose, a scope and an expiry, withdrawal is final, and marketing must stop within the
day. NorthBank was fined in 2022 for continuing marketing after withdrawal because the
contact centre's system did not hear about it. Every consent conversation now starts with
that fine.

**Payments migration.** The Rapid Payments Scheme moved to ISO 20022 messages last year.
The Payments Hub team built a new gateway; it conforms to the scheme's format exactly,
because there is no negotiating with a scheme.

**Lending and decisioning.** Origination and decisioning are separate systems owned by
separate teams under separate directors, but they release together and share a planning
board, because a change to the scorecard is a change to what the application form asks.

**Branch staff and credit decisions.** The Fair Treatment Rules and the bank's own conduct
policy say front-line staff may not influence a credit decision. The contact centre system
has no integration with decisioning by design. Recently a "quick quote" feature appeared in
the contact centre tooling that calls the decision engine directly. Compliance found it in
a review and it is under investigation.

**Regulatory returns.** Assembled from the ledger, account openings and loan disbursements,
partly by hand, partly by a reporting system that consumes events. Finance Systems wants
the return lines to reconcile to the ledger automatically.

**Identity.** The digital login platform was built by a vendor in 2020 and nobody in the
architecture team is quite sure which part of the business it serves; it was never placed
on the capability map.

## The teams

| Team | Directorate | Looks after |
|---|---|---|
| Customer Platform Team | Customer | Onboarding, KYC, consent |
| Financial Crime Team | Risk | Sanctions screening, fraud scoring, cases |
| Accounts Team | Products | Current and savings account platform |
| Core Banking Team | Products | The ledger, and Sovereign |
| Cards Team | Products | Card issuing and the CardCo integration |
| Payments Team | Payments | The payments hub |
| Scheme Connectivity Team | Payments | Gateways to the schemes |
| Lending Team | Credit | Loan origination and servicing |
| Credit Risk Team | Risk | Decisioning, scorecards, affordability |
| Finance Systems Team | Finance | Regulatory reporting |
| Channels Team | Customer | Branch and contact centre tooling |
| Digital Platform Team | Technology | Identity and access |

Products and Payments are the largest directorates. Risk owns both the fraud and the credit
models, which is why the Credit Risk team and the Lending team belong to different
directors despite working as one. Compliance sits outside technology and reviews everything
above quarterly.

## What they asked for

A model that is precise about invariants and values: what an IBAN is, what money is, what
a consent is and when it stops being valid, what must be true of a ledger entry, a card
authorisation, a loan schedule. They want the model to be usable as the reference for the
rules the platform enforces and as the evidence pack for the next regulatory review. Known
problems, including the quick-quote feature and the unplaced identity platform, are to be
left in so the validation output shows them.
