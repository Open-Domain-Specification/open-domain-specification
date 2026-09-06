# NorthBank: discovery record

How the model in `workspace.ts` was arrived at, following the interview playbook in the
ODS skill. Because the client's emphasis was on rules and values, Phase E (inside each
context) took most of the time: every interview ended with "what must never be allowed to
happen to a <thing>", and the invariants and value objects in the model are the answers.
Interview summaries are composites in the voice of the role.

## 1. Orientation

The COO's sentence: "We look after people's money and lend them some of ours, without ever
getting either wrong." The interviews were ordered by the life of a customer: onboarding,
account, ledger, payments, cards, borrowing, fraud, reporting, and the people who answer
the phone.

## 2. Stakeholder interviews

### Head of Customer Platform (onboarding and KYC)

"A customer is a person we have verified. Eighteen or over, no exceptions; a verified
customer has at least one identity document on file and it isn't expired. Onboarding starts,
we screen the name against the sanctions lists, and if there's a match we hold everything
until Financial Crime clears it. Only then can an account be opened. We call them customers;
the branches still say members from the mutual days; the payments people say party. Consent
is the other half of my world. A consent has a purpose, marketing or data sharing or open
banking, a scope, when it was given and when it was withdrawn. Withdrawn is final: you get
a new consent, you never un-withdraw. Open banking consents expire within twelve months.
When a consent is withdrawn we publish it the same second, because of the fine."

Recorded as: Customer & KYC serving both the "Onboarding & KYC" and "Consent" subdomains;
the Customer aggregate with IdentityDocument `includes`, DateOfBirth, Address and
KycStatus, invariants `AdultOnly`, `VerifiedNeedsDocument`, `DocumentNotExpired`; the
Consent aggregate with ConsentPurpose and ConsentScope, invariants `WithdrawnIsFinal`,
`PurposeRequired`, `OpenBankingConsentExpires`; `ScreenCustomer` on the onboarding
application service, which is what makes the screening call (card 92); the
"Customer onboarding" process, which starts on `OnboardingStarted`, screens, waits for the
engine's answer, holds on a match and ends on `CustomerVerified` (card 60: it was two
policies, and neither could hold the prospective customer between the two events);
`CustomerVerified`, `ConsentGiven`
and `ConsentWithdrawn` published with schemas; the glossary entry for Customer with aliases
Member and Party.

### Financial Crime lead (sanctions)

"We screen a name, date of birth and country against the lists, and return a match score.
The lists are bought; the screening engine is bought; the API is documented. If someone
matched we say so and the caller stops."

Recorded as: Sanctions Screening as generic; `ScreenParty` as an open host operation with a
schema, raising `PartyMatched`.

### Accounts Team lead

"An account is the product: on our platform that means current accounts; savings are still
Sovereign rows and will be the same shape when they come across. An account has an
account number and an IBAN, a status of open, frozen or closed, an overdraft limit and
mandates saying which verified customers can operate it. Rules: the IBAN checksum must be
valid or the account doesn't exist; the balance never goes below minus the overdraft
limit; a frozen account accepts no debits; a closed account has a zero balance; every
mandate holder is a verified customer. We freeze when Financial Crime opens a case. Our
balance is the available balance, which is ledger balance less pending card
authorisations, so we hear every authorisation from Cards and hold the amount until the
capture posts; the ledger people say balance and mean the posted one, and the contact
centre says balance and means whatever the screen shows. Money and account numbers are one
shared library between us and the ledger; we change it together and release it together."

Recorded as: Accounts as core; the Account aggregate (current accounts only) with Mandate
`includes`, IBAN, AccountNumber, Money, OverdraftLimit and AccountStatus, posted balance,
pending authorisations and available balance; six invariants including
`AvailableIsPostedLessHolds`; `OpenAccount`, `FreezeAccount` and `GetAvailableBalance` as
open hosts; `PlaceHold` internal; the "Freeze on fraud case", "Update balance on posting"
and "Hold on card authorisation" policies; a shared kernel with the Shared Kernel context
(card 56, section 6); the glossary entry for Balance with the three meanings.

### Core Banking lead (ledger and Sovereign)

"A journal entry is at least two postings, each a debit or a credit of an amount to a
ledger account, and the debits equal the credits or it doesn't post. A ledger account is a
customer's account number or a nominal: the loan book, scheme suspense, fee income. A
disbursement debits the loan book and credits the customer; if every posting had to go to
a customer account nothing would ever balance. One currency per entry. Once posted an entry
is never changed; you reverse it with another entry. Payments, lending and the accounts
platform post through our API, and they're consulted before we change it. Sovereign still
holds savings and runs the nightly batch; the batch file is how we learn about savings
movements, and we translate every line of it. Nobody touches Sovereign's tables. It is
what it is."

Recorded as: Ledger as supporting; JournalEntry with Posting `includes`, Money and
AccountNumber (both borrowed from the Shared Kernel context, card 56), LedgerAccount
with CustomerLedgerAccount and NominalLedgerAccount as kinds of it (card 59,
section 12), PostingDirection and ValueDate; invariants `EntryBalances`,
`AtLeastTwoPostings`, `SingleCurrencyPerEntry`, `ImmutableOncePosted`; `PostEntry` and
`ReverseEntry` as open hosts; `EntryPosted` published; the "Import nightly batch" policy
translating the legacy event; Sovereign Core (legacy) flagged as a big ball of mud with
`NightlyBatchCompleted` as its one published event; glossary entries for Account (the
ledger's meaning) and Posted balance.

### Payments Hub lead

"An instruction is a customer telling us to pay a payee an amount on a date. Payer and payee
can't be the same account, the amount is positive, there's a daily limit per account, the
account has to cover it (we ask the accounts platform for the available balance before the
instruction exists; the overdraft is their rule, not ours), and if the execution date is
today it has to be before the scheme cut-off. Every instruction is scored by fraud before
it goes anywhere; flagged means rejected, never submitted. Cleared
means we submit to the scheme through the gateway, in the scheme's format exactly, because
you don't negotiate with a scheme. When settlement is confirmed we post to the ledger. We
say instruction; cards say payment and mean a card transaction; the branches say transfer."

Recorded as: Payments as supporting; PaymentInstruction with Payee, Money, ExecutionDate
and PaymentStatus; invariants `PayerNotPayee`, `AmountPositive`,
`FundsAvailableAtInitiation` (a read of `GetAvailableBalance` through an ACL),
`CutOffRespected`, `FlaggedNeverSubmitted`, and `DailyLimit` on the context itself,
guarded by `InitiatePayment`; the "Instruction lifecycle"
process, which starts on `PaymentInitiated`, waits for the scorer's verdict
(`TransactionVerdict`, the answer `ScoreTransaction` returns) and then for the answer
`SubmitToScheme` comes back with (`SchemeSettlement`, or the refusal `SchemeRefusal`), issues `ScoreInstruction`,
`SubmitPayment`, `SendToScheme`, `ConfirmSettlement`, `RejectPayment` and `PostSettlement`,
and ends on `PaymentSettled` or `PaymentRejected`. It was recorded as seven chained
policies until card 60; the lead described one instruction going from initiated to settled,
and the seven could not say that anything was being waited for.
conformist consumption of the scheme gateway; customer-supplier towards Ledger.
`InitiatePayment` rejects with `InstructionRefused` when the daily limit, the funds check or
the cut-off stops it: no instruction exists, so the channel is told which rule stopped it.

### Scheme Connectivity lead

"We turn a submission into a scheme message and send it. The scheme confirms or rejects.
ISO 20022 now. Our API to the hub is documented; the hub takes our format as it is."

Recorded as: Scheme Gateway as generic; SchemeMessage with SchemeFormat; the scheme itself
as an external context, Payment Scheme, publishing `SchemeSettlementConfirmed` and
`SchemeRejected` in its own `SchemeResponse` shape; `SubmitToScheme` as an open host that
consumes both of them and **returns** `SchemeSettlement` or **rejects with** `SchemeRefusal`,
which is what "send it and await the response" means. Until card 95 the gateway was credited
with raising the scheme's two answers itself and the scheme was never declared at all: the
model said the gateway made the settlement happen, and the one system the whole payment path
depends on was missing from the map.

### Cards Team lead

"A card belongs to an account. The PAN is tokenised, we keep the token and the last four, and
the number passes Luhn. A blocked or expired card authorises nothing; an authorisation can't
exceed the available balance, which we ask the accounts platform for. CardCo sends us the
authorisation request in their format and we translate it. Fraud scores it synchronously;
flagged means we block the card. We would outsource the whole thing to CardCo if the
contract allowed it."

Recorded as: Cards as generic; the Card aggregate with Authorisation `includes`, PAN,
Expiry, CardStatus and Money; invariants `PanLuhnValid`, `NoAuthOnBlockedCard`,
`ExpiredCardNoAuth`, `AuthWithinAvailableBalance`; `AuthoriseCard` and `BlockCard` as open
hosts; `CardAuthorised` and `CardBlocked` published; the "Block on flagged card
transaction" policy; anti-corruption consumptions of Accounts and Fraud.

### Head of Lending and Head of Credit Risk (joint session)

Lending: "An application is a customer asking for an amount over a term. One open
application per customer. We send it for a decision and record the outcome. A loan exists
once the agreement is signed; nothing is disbursed before signature; the APR is within the
cap; the schedule's installments sum to principal plus interest; a missed installment puts
the loan in arrears. Disbursement posts to the ledger. We call disbursement drawdown; the
ledger calls it a posting."

Credit Risk: "We take the application and the customer record, pull a bureau report no
older than thirty days, run the scorecard, and check affordability: commitments over income
at most forty-five percent. Every decision carries its reasons because the customer is
entitled to them. Our API is documented but Lending doesn't translate it; we plan and
release together, one board, two directors."

Recorded as: Lending and Credit Decisioning both core; LoanApplication and Loan aggregates,
the latter with RepaymentSchedule and Installment `includes`; `OneOpenApplicationPerCustomer`
on the context, guarded by `SubmitApplication`; invariants `NoDrawdownBeforeSignature`,
`AprWithinCap`,
`InstallmentsSumToPrincipalPlusInterest`, `ArrearsAfterMissedInstallment`; the
CreditDecision aggregate with BureauReport, Affordability and CreditScore, invariants
`AffordabilityRatioCap`, `DecisionExplained`, `BureauReportFresh`; the Scorecard domain
service; `Decide` as an open host; a partnership with conformist consumption; policies
"Decide on submission", "Record decision", "Disburse on signature", "Post disbursement",
and the arrears rule kept as found (section 7).

### Financial Crime lead (fraud)

"The scorer takes a transaction, its channel, amount and payee, and returns flagged or
cleared, synchronously, because payments wait on it. A flag opens a case with the alert
attached; a case always has at least one alert and a score always has its reasons. Cases
freeze accounts. Since the scam reimbursement rules every flag we miss is our money."

Recorded as: Fraud as core; FraudCase with Alert `includes`, RiskScore and CaseStatus;
invariants `CaseHasAlert` and `ScoreExplained`; FraudApp's `ScoreTransaction` returning
`TransactionVerdict` — "synchronously, because payments wait on it" — and raising the
TransactionScorer's `TransactionFlagged`; `FraudCaseOpened`
published; the "Open case on flag" policy; anti-corruption consumption of `CardAuthorised`
for post-authorisation monitoring.

### Finance Systems lead (regulatory reporting)

"A return is a report code for a period, made of lines with amounts. The lines must
reconcile to the ledger, a period is closed before we file, and a return is filed once. We
accumulate lines from ledger postings, account openings and loan disbursements as they
happen, and from Sovereign's batch for savings. We take the events as published; we have no
say in them and don't want one. When the branches say return they mean a returned payment.
Different thing."

Recorded as: Regulatory Reporting as supporting; RegulatoryReturn with ReportLine
`includes`, ReportingPeriod and Money; invariants `LinesReconcileToLedger`,
`PeriodClosedBeforeFiling`, `FiledOnceOnly`; the "Accumulate on posting" policy fanning
three events into `AccumulateLine`; conformist consumptions of Ledger, Accounts and
Lending; an anti-corruption layer for Sovereign.

### Channels lead (branch and contact centre)

"A service request is a customer asking for something through a branch, the phone or chat,
with notes. We authenticate the customer through the digital login before we act on
anything, and notes are never edited, only added. We read customers, balances and cards
through the documented APIs and take them as they come. When a consent is withdrawn we
suppress marketing the same day; that's the fix for the fine. Quick quote: yes, a contractor
added a button that calls the decision engine so an agent can tell a customer if they'd
get a loan. Compliance has asked us about it."

Recorded as: Branch & Contact Centre as supporting; ServiceRequest with Note `includes`,
Channel and RequestStatus; invariants `AuthenticatedBeforeAction` and `NoteImmutable`; the
"Suppress marketing on withdrawal" policy; conformist consumptions of Customer, Accounts,
Cards and Identity; separate ways with Credit Decisioning; the quick-quote consumption
kept as found (section 7).

### Digital Platform lead (identity)

"Usernames, credentials, step-up authentication. Vendor built, we run it. It authenticates
customers for every channel. Which business capability is it? Nobody's ever told us."

Recorded as: Identity & Access with a Credential aggregate and `AuthenticateCustomer` as an
open host, and no subdomain, as found (section 7).

## 3. Event storming

Three sessions (customer and accounts; money movement; credit and risk) then a joint one.
The connected timeline, condensed:

| Event | Raised by | Reacted to by |
|---|---|---|
| OnboardingStarted (internal) | StartOnboarding | Screen on onboarding |
| PartyMatched | ScreenParty | Hold on sanctions match |
| CustomerVerified | VerifyCustomer | Accounts allows opening |
| ConsentGiven / ConsentWithdrawn | GiveConsent / WithdrawConsent | Contact centre suppresses marketing |
| AccountOpened / Frozen / Closed | OpenAccount / FreezeAccount / CloseAccount | Reporting accumulates |
| PaymentInitiated | InitiatePayment | Score the instruction |
| TransactionVerdict (an answer, not an event) | ScoreTransaction returns it | Payments rejects or submits |
| TransactionFlagged | ScoreTransaction | Open case; block card |
| FraudCaseOpened | OpenCase | Freeze account |
| PaymentSubmitted (internal) | SubmitPayment | Submit to scheme |
| SchemeSettlementConfirmed / Rejected | the scheme (external) | Scheme Gateway answers the hub |
| SchemeSettlement / SchemeRefusal (answers, not events) | SubmitToScheme returns / rejects with them | Confirm settlement or reject |
| PaymentSettled / Rejected | ConfirmSettlement / RejectPayment | Post to ledger |
| EntryPosted | PostEntry / ReverseEntry | Accounts updates balance; Reporting accumulates |
| NightlyBatchCompleted | Sovereign batch | Ledger imports; Reporting accumulates |
| CardAuthorised / CardBlocked | AuthoriseCard / BlockCard | Accounts places a hold; Fraud monitors |
| CardAuthorisationApproved / Declined (answers, not events) | AuthoriseCard returns / rejects with them | CardCo is told, and waits for it |
| ApplicationSubmitted | SubmitApplication | Decide |
| DecisionMade | Decide | Record decision |
| LoanApproved / ApplicationDeclined (internal) | RecordDecision | (offer, out of scope) |
| LoanAgreementSigned (internal) | SignAgreement | Disburse |
| LoanDisbursed | Disburse | Post to ledger; Reporting accumulates |
| InstallmentMissed | MarkInstallmentMissed | (arrears rule, mis-written) |
| CustomerAuthenticated | AuthenticateCustomer | Contact centre proceeds |

## 4. Language collisions

- **Customer / Member / Party.** One record, three names; aliases on the Customer term,
  and Member and Party defined again in the contexts that say them (Channels, Payments).
- **Balance.** Available (Accounts), posted (Ledger), "what the screen shows" (Channels).
  Accounts owns the term and defines the other two against it; Ledger and Channels each
  carry their own entry so the meaning is written where it is spoken.
- **Account.** A product with mandates and an overdraft (Accounts) versus a place a posting
  lands, which may be a nominal such as the loan book (Ledger). Two terms in two contexts.
- **Payment.** An instruction (Payments) versus a card transaction (Cards). Two contexts;
  the Payments glossary term lists Payment as an alias of Instruction and says what it is
  not.
- **Return.** A regulatory return (Reporting) versus a returned payment (Channels). Both
  recorded.
- **Authorisation.** A card authorisation (Cards) versus a mandate's authority to operate an
  account (Accounts). Two entities in two aggregates.
- **Drawdown / Disbursement / Posting.** Lending, product documents and the ledger for the
  same movement of money; aliases on the Lending term.

## 5. Classification

| Subdomain | Type | Reasoning |
|---|---|---|
| Current & Savings Accounts | core | "The account is the relationship"; where the Fair Treatment Rules bite |
| Lending | core | Below-market loss rate for fifteen years |
| Credit Decisioning | core | The bank's own scorecard and affordability rules |
| Fraud | core | Every missed flag is the bank's money |
| Onboarding & KYC | supporting | Regulated and necessary; "checks are checks" |
| Consent | supporting | Regulated; the fine made it a first-class thing, not a differentiator |
| Ledger | supporting | Must be perfect; not unique |
| Payments | supporting | Rails are the schemes'; the hub is the bank's wiring |
| Regulatory Reporting | supporting | Required; measured on accuracy and effort |
| Branch & Contact Centre | supporting | Service, not product |
| Sanctions Screening | generic | Bought lists, bought engine |
| Scheme Connectivity | generic | The scheme's format, not the bank's |
| Cards | generic | "We would outsource it if the contract allowed" |
| Identity & Access | generic | Vendor built |

The Shared Kernel context serves none of these, and card 95 took away the one it used to
have. "Shared Financial Primitives" was a supporting subdomain with a single context in it,
invented in card 56 so that `context-serves-subdomain` would stop asking; no capability map
of the bank has such a capability and no customer journey runs through it. What the kernel
serves is whatever its sharers serve, and the rule now says so. The team that owns Money and
AccountNumber stays, because somebody does own them.

## 6. The context map

- **Shared kernel**, card 56: Money and AccountNumber are declared once, in a Shared Kernel
  context of its own (no subdomain of its own since card 95, its own team), and every context that carries
  an amount or a ledger account declares one shared-kernel relationship with it and borrows
  what it needs. Six sharers (Accounts, Ledger, Payments, Cards, Lending, Reporting) is six
  relationships to one kernel, not fifteen pairwise agreements among themselves (decision
  16's amendment). Accounts and Ledger also borrow AccountNumber; the rest borrow Money
  only.
- **Partnership** between Lending and Credit Decisioning: one board, joint releases, no
  translation between them.
- **Separate ways** between Branch & Contact Centre and Credit Decisioning: conduct policy;
  front-line staff may not influence a decision.
- **Customer-supplier** where the downstream is consulted before the upstream changes:
  Payments and Lending towards Ledger; Payments and Cards towards Fraud.
- **Upstream-downstream** for every other consumption with the stated stance: conformist
  where the downstream "takes it as published" (Channels, Reporting, Payments towards the
  scheme gateway, Accounts towards Customer), anti-corruption layer where it translates
  (Ledger towards Sovereign, Cards towards CardCo's format and Accounts, Customer towards
  Sanctions, Payments towards Accounts for the funds check, Accounts towards Cards for the
  authorisation hold).
- **The three systems we do not run**, declared as external contexts: the Screening Vendor
  behind Sanctions Screening, CardCo behind Cards, and — since card 95 — the Payment Scheme
  behind the gateway. Each publishes in its own shape and each is conformed to, because you
  negotiate with none of them.

## 7. Validation and what we left in

Three diagnostics, each a real finding the client asked to keep visible:

- `separate-ways` on Branch & Contact Centre's consumption of `Decide`: the quick-quote
  button. The relationship says the two never integrate; the consumption says they do.
  Compliance's investigation decides which one is wrong.
- `context-serves-subdomain` on Identity & Access: the vendor-built login platform was never
  placed on the capability map, so it serves no subdomain in the model.
- `consumable-kind` on Lending's "Escalate arrears" policy: it issues `ArrearsNoticeIssued`,
  which is an event, where an operation (issuing the notice) belongs. The rule was
  transcribed from a process document that names the outcome rather than the action.

## 8. What the model leaves out

Mortgages beyond the shared origination flow, interest calculation and accruals, arrears
servicing beyond the first notice (statutory notice intervals, forbearance), statements
and notifications, treasury and liquidity, the operational resilience regime (impact
tolerances are a property of services, not of the domain model), open banking APIs beyond
consent, the data warehouse, HR and branch operations, complaint handling as a separate
process, and everything inside Sovereign beyond its nightly batch. Each is a further
session with its own owner.

## 9. Peer review

An independent review of the model was taken as a second opinion. Each finding is listed
with the outcome; the model, and where the narrative was at fault this record, were
changed for the accepted ones. The three deliberate diagnostics in section 7 are untouched
and validation still returns exactly those three.

Accepted

- Authorisation holds: Accounts defined its available balance as posted less pending card
  authorisations but never heard about an authorisation. Changed: `CardAuthorised` now
  carries the amount on its own schema; Accounts consumes it through an ACL, a "Hold on
  card authorisation" policy issues the new internal `PlaceHold`, the Account root carries
  `postedBalance` and `pendingAuthorisations` beside `availableBalance`, and the invariant
  `AvailableIsPostedLessHolds` ties the three together. The Accounts interview and the
  context map record the new upstream-downstream relationship from Cards.
- Funds check on outbound payments: nothing stopped an instruction the account could not
  cover. Changed: the Payments Hub interview now says the account has to cover it; the hub
  consumes `GetAvailableBalance` through an ACL, `InitiatePayment` says so, and the
  invariant `FundsAvailableAtInitiation` records the rule with the overdraft left to
  Accounts.
- Ledger postings coupled to customer accounts: `Posting` referenced the Accounts product,
  so a disbursement ("debit loan book, credit the account") could not balance. Changed:
  Posting goes to a `LedgerAccount` value (a customer `AccountNumber` or a nominal code),
  the Core Banking interview says so, a Ledger glossary entry for Account separates the two
  meanings, and section 4 records the collision.
- Fraud verdicts on the case aggregate: `TransactionFlagged` and `TransactionCleared` were
  provided by `FraudCase`, although a cleared transaction opens no case. Changed: both were
  moved to the `TransactionScorer` domain service, and card 92 turned the pair into one
  answer and one fact (see the revision below).
- Split-brain savings: the brief says savings are still on Sovereign, but Accounts modelled
  current and savings products. Changed: Accounts holds current accounts only (product
  code, root, schemas and overdraft description), Sovereign keeps savings in the same
  subdomain, and the Accounts interview says when savings will come across.
- PAN Luhn on a token: the stored value is a token and four digits. Changed: the invariant
  is a construction rule (a PAN value is only created from a full number that passed Luhn).

Partially accepted

- Multi-instance invariants (`DailyLimit`, `OneOpenApplicationPerCustomer`): correct that
  one instance cannot see its siblings. ODS now has a place for them: decision 27 gives the
  bounded context invariants of its own, so both moved off their aggregate to Payments and
  Lending and name the operation that keeps them, `InitiatePayment` and `SubmitApplication`.
- Cross-context invariants (`AuthWithinAvailableBalance`, `LinesReconcileToLedger`):
  reworded as a check through the ACL at authorisation time and as a precondition of
  filing (constraining the return as well as the line), because the rules are real even
  though the data is elsewhere. Not converted to policies: neither is a reaction to an
  event.
- Alias dumping: aliases stay, and the words are now also defined where they are spoken:
  Member and Balance in Branch & Contact Centre, Party in Payments, Posted balance in
  Ledger.
- `AdultOnly` on a date: repointed to the Customer root and stated as "eighteen on the day
  onboarding starts"; a date of birth is not itself adult.
- Arrears too naive: the definition is the Head of Lending's own words and the notice
  already exists as `IssueArrearsNotice`; the term now names it, and statutory notice
  intervals and forbearance are added to section 8 as a further session.
- Shared kernel not used by Ledger: the kernel is real (one library, two teams) but the
  ledger's Posting used a plain string. Fixed by the LedgerAccount change: the ledger now
  declares `AccountNumber` too, with the shared-kernel note.
- "What must never happen" produced misfiled invariants: fair for the four reworded above;
  the technique stays, since it is what produced the sixty-odd rules the client asked for.

Rejected

- Partnership contradicts conformist: the brief says one planning board and joint
  releases, and Credit Risk said "Lending doesn't translate it". Partnership is the
  relationship, conformist is the consumption stance; the DSL keeps them separate for
  exactly this case. The claim that Risk governs Lending is not in the brief.
- Scheme Gateway is an adapter, not a context: it has its own team, directorate, subdomain
  and documented API; a context is what a team owns.
- Cards should be supporting: the brief lists cards processing among the things nobody
  claimed as a differentiator, and the processor is already outsourced.
- RepaymentSchedule should be a value object: the interview says the schedule is re-cut on
  arrears and installments are marked paid over time; both have a lifecycle.
- Missing mortgages: section 8 leaves mortgages beyond shared origination out, by
  agreement with the client.
- Operational resilience regime ignored: impact tolerances are a property of services, not
  of the domain model, and nobody asked for them; recorded in section 8.
- The record is synthetic and friction-free: the interviews are declared composites, and
  the quick-quote investigation, the 2022 fine and the Sovereign stalemate are the friction.
- The event storming is sanitised: it is declared condensed; compensations and dead ends
  are among the further sessions in section 8.

## 10. Revision (card 56): the shared kernel becomes a context

A review of the metamodel (issue 8, seventh run) pointed out that Accounts, Ledger,
Payments, Cards, Lending and Reporting each declared their own copy of Money, with a
comment saying one library implements it; the model was drawing six declarations of a
fact the business states once. Decision 16's amendment says how many contexts share one
kernel: the kernel is a context of its own, owning the value objects it shares, and every
sharer declares one shared-kernel relationship with it. NorthBank's Money and AccountNumber
are exactly that library, so the model now says so: a Shared Kernel context (a supporting
subdomain of Platform, its own team, its own two value objects) that Accounts, Ledger,
Payments, Cards, Lending and Reporting each borrow from, over one relationship apiece,
instead of a pairwise shared kernel between Accounts and Ledger and a private copy
everywhere else. No aggregate, invariant, event or policy changed; a `uses` relation is
never declared for the borrowed value objects, because a relation may not cross a context
boundary (decision 14) and the attribute's `valueobject` reference is the only link. The
three deliberate diagnostics in section 7 are untouched, and validation still returns
exactly those three.

## 11. Revision (card 71): the outside world becomes two external contexts

Two systems the bank depends on were named all over this record and nowhere in the model.
CardCo "sends us the authorisation request in their format and we translate it", and the
model said so only in a schema's description ("CardCo's format, translated on the way in");
the sanctions engine and its lists "are bought" and behind "a documented API", and the model
had the bank's own Sanctions Screening context and nothing behind it. Decision 28 gives both
a home: a bounded context with `external: true`, which provides and consumes and takes part
in relationships, and which has no subdomain, no team and no aggregates, because what
happens inside somebody else's machine is not ours to state.

- **CardCo**: a service with one published event, `AuthorisationRequested`, carrying
  CardCo's own wire format. Cards consumes it through an anti-corruption layer, made by
  `AuthoriseCard`, and the relationship on the map is published-language upstream,
  anti-corruption-layer downstream. `CardAuthorisationRequest` stays in Cards, where it
  belongs: it is what CardCo's message *becomes* once Cards has translated it, and its
  description now says that rather than claiming to be CardCo's format.
- **Screening Vendor**: a service with one open-host operation, `MatchAgainstLists`, and its
  own query schema. Sanctions Screening's `ScreenParty` consumes it as a conformist, which
  is what "the API is documented" and "the engine is bought" mean.

Neither is a subdomain of the bank and neither has a team here, which is the point: the
capability map is the bank's, and these two are not on it. Scheme Gateway is untouched and
stays internal — it is the bank's own adapter with its own team, as section 9 already
argued — and so does Sovereign, which is the bank's own mainframe however little anyone can
read of it.

The other finding of card 71 was `event-unraised`, a new warning about an event no operation
of its context raises. NorthBank had exactly one: Sovereign's `NightlyBatchCompleted`, which
the Ledger and Reporting both react to and which nothing in the model caused. The Core
Banking lead's own words say what causes it — Sovereign "runs the nightly batch" — so the
model named that job: a `NightlyBatch` service with one internal operation,
`RunNightlyBatch`, raising the event. Nothing else moved, and validation still returns
exactly the four deliberate diagnostics of section 7 plus card 70's second reading of the
quick-quote crossing.

## 13. Revision (card 90): the batch job comes back out, and the guards are named

The lead said Sovereign "runs the nightly batch". He did not say which program cuts the
file, and nobody at NorthBank could: Sovereign is flagged a big ball of mud precisely
because its insides cannot be read. `NightlyBatch` and `RunNightlyBatch` were the model
answering a rule rather than an interview, so they are gone. A big ball of mud is exempt
from `event-unraised`, `aggregate-root` and `root-identity` as an external context is
(decision 28's second amendment): it may say what it emits without saying how, which is
exactly what this record knows. `NightlyBatchCompleted` still carries the batch file's shape
and the Ledger still imports from it.

Two rules that were carried in prose are now in the model. `FundsAvailableAtInitiation` and
`AuthWithinAvailableBalance` are preconditions — the balance is read at the moment of the
call and the aggregate cannot hold either after the fact — and both now name the operation
that checks them, `InitiatePayment` and `AuthoriseCard` on their contexts' application
services (decision 19's 2026-09-08 amendment). Reading either invariant now tells you where
it is enforced instead of pointing at a comment.

Every cross-context call also names its caller. Twelve of NorthBank's seventeen said only
that a service depended on a neighbour, so the instruction lifecycle dead-ended at the hub's
boundary and never reached the scheme's answer or the ledger posting; `SendToScheme`,
`PostSettlement`, `ScoreInstruction`, `PostDisbursement`, `RequestDecision`,
`ScreenCustomer`, `Decide` and `RaiseRequest` are the operations that make those calls, and
the flow map now follows them (decision 21's third amendment).

Last, Scheme Gateway is no longer declared downstream of Payments Hub. That relationship
existed for the instruction id the scheme's submission and settlement payloads carry, and
its own description admitted the gateway "never reads the instruction back": an id echoed
in a payload is written for its reader, not a dependency on another context's model
(decision 14's second amendment). The relationship that matters between the two — Payments
downstream of the scheme, "you don't negotiate with a scheme" — is untouched.

## 12. Revision (card 59): a ledger account is a customer's or a nominal

The Core Banking lead defines the ledger account in one sentence: "a ledger account is a
customer's account number or a nominal: the loan book, scheme suspense, fee income." The model
had that as one value object with a `kind: 'customer' | 'nominal'` flag beside two fields, one
described "set when kind is customer" and the other "set when kind is nominal" — a shape that
tells a reader which fields to ignore, and tells the validator nothing.

Decision 22 lets the two be said. LedgerAccount stays as the thing a posting lands on, and
becomes what no instance is ever just: its description now says so, since there is no
abstractness flag and there does not need to be. **CustomerLedgerAccount** holds the
`accountNumber` (still the Shared Kernel's AccountNumber, borrowed by reference), and
**NominalLedgerAccount** holds the `nominalCode`. Posting still `uses` LedgerAccount at `1`,
because a posting lands on one ledger account whichever kind it is, and the relation map draws
the two kinds hanging off it with a hollow triangle.

Nothing else in the Ledger moved: `EntryBalances`, `AtLeastTwoPostings`,
`SingleCurrencyPerEntry` and `ImmutableOncePosted` are unchanged, and so is the disbursement
the split existed for — debit the loan book (a nominal), credit the customer (an account
number), one entry that balances. Validation still returns exactly the four diagnostics of
section 7 plus card 70's second reading of the quick-quote crossing.

The accounts themselves were considered and left alone. Decision 22's context reads NorthBank's
accounts as current, savings and loan accounts, but this record does not: the Accounts Team
lead says "on our platform that means current accounts; savings are still Sovereign rows and
will be the same shape when they come across", and loans are Lending's own aggregate in
another context. Kinds of Account would be a claim no interview here supports. When savings
migrate, that is the moment to ask whether they are a kind of Account or the same shape.

## Value invariants (card 82)

A value object may now own the rules it keeps by construction, so three rules moved off the
aggregates that happened to hold the value. `IbanChecksumValid` belongs to `IBAN`: an IBAN
whose mod-97 checksum fails is not a badly configured account, it is not an IBAN, and no save
of `Account` is what keeps that true. `PanLuhnValid` belongs to `PAN` for the same reason,
and `ScoreExplained` to `RiskScore`, which carries its reasons or is not a score the bank may
act on. What stayed on the aggregates is everything a value cannot see for itself: a frozen
account refusing debits, a balance against an overdraft limit, a decision explained by a
bureau report.

## Revision (card 92): the verdict is an answer, and the screening call leaves the boundary

The Financial Crime lead said it in one sentence — "the scorer takes a transaction, its
channel, amount and payee, and returns flagged or cleared, synchronously, because payments
wait on it" — and the model wrote it as two published events, because a process could wait
only on events. That made a caller subscribe to hear the answer to its own question, and it
made Payments consume two events it never really heard as facts. Decision 23's second
amendment gives the shape a name: `ScoreTransaction` **returns** `TransactionVerdict`, the
transaction and its score, and the "Instruction lifecycle" process waits on that answer.
Whether the score is above the threshold is the process's own branch, in its description
rather than in the model, exactly as every other condition in a process is (decision 15).

`TransactionFlagged` stays an event, because a flag is a fact and two contexts act on it
where it happened: Fraud opens a case, Cards blocks the card. `TransactionCleared` is gone.
Nobody publishes a clearance; it was an event only because the model had nowhere else to put
the call coming back.

Two consumptions moved with it. Payments' consumptions of the two verdict events are gone —
the answer arrives down the `ScoreTransaction` call it already makes — and Customer & KYC
stopped calling Sanctions Screening from a domain service. A domain service is the inside of
the model, the same as an aggregate, so what leaves the boundary leaves through the
application service (decision 17's second amendment). The onboarding application service now
consumes `ScreenParty`, made by its own `ScreenCustomer`, and the `KycScreening` domain
service is gone: the Head of Customer Platform described one step, "we screen the name
against the sanctions lists", and once the call moved that service held nothing at all — no
rule, no reading across aggregates. The screening the interview describes is unchanged; what
changed is which of this context's own parts makes the call.

## Revision (card 95): the scheme is somebody else's machine, and the kernel serves no subdomain

Three things the model said that the interviews did not.

The Scheme Connectivity lead said "we turn a submission into a scheme message and send it.
The scheme confirms or rejects", and the model gave `SubmitToScheme` a `raises` list with
`SchemeSettlementConfirmed` and `SchemeRejected` on it. That says the gateway makes the
settlement happen. It does not: the scheme does, on its own timings, and the gateway waits.
The scheme is now an external context of its own — the last system in the payment path that
was not on the map — publishing both facts in its own `SchemeResponse` shape, and the
gateway consumes them through the operation that waits, `SubmitToScheme`. What the hub gets
is the answer to the call it made: `SubmitToScheme` **returns** `SchemeSettlement` and
**rejects with** `SchemeRefusal`, and the "Instruction lifecycle" process waits on those two
answers where it used to consume two events it never heard first-hand. "We submit to the
scheme through the gateway" is what the hub lead said, and now that is what the model draws.

`AuthoriseCard` got the same treatment for the same reason. The Cards lead said "CardCo
sends us the authorisation request in their format and we translate it", and the answer goes
back the same way: CardCo waits on the call. The operation's description said it approved or
declined and the model named neither answer, so the decline — the outcome the blocked-card,
expired-card and available-balance rules all produce — existed nowhere at all. It now
returns `CardAuthorisationApproved` and rejects with `CardAuthorisationDeclined`, whose
reason is one of those three rules.

Last, the Shared Kernel context lost the subdomain card 56 gave it. See section 5.

The deliberate diagnostics of section 7 are untouched: the same four, for the same reasons.

## Revision (card 98): CardCo calls the bank, and a subscription names what wakes

Two things the model inverted or left unwritten.

The Cards lead said "CardCo sends us the authorisation request in their format and we
translate it", and until now the model drew that backwards: CardCo published an
`AuthorisationRequested` event carrying its own wire format, Cards consumed it, and nothing
in the workspace consumed `AuthoriseCard` — the operation the processor actually calls. The
inversion was not the author's choice. `schema-context` refused a consumable carrying
another context's schema, so the truthful shape could not be written down, and the schema
that stood in for CardCo's format, `CardAuthorisationRequest`, described a translated form
that only exists behind the layer.

Upstream is who dictates the model, not who provides the consumable (decision 03, amended).
CardCo dictates the message; the bank provides the operation and translates at its own
boundary. So `AuthoriseCard` now carries **CardCo's** `CardCoAuthorisationMessage` as its
request and answers in the bank's own shapes, CardCo's feed **consumes** it — named in `by`
by `RequestAuthorisation`, the processor's own step, which is all the bank sees of it — and
the pair carries two relationships, one each way: CardCo upstream with a published language
and Cards downstream with an anti-corruption layer, and Cards upstream with an open host
service that CardCo takes as it stands. `CardAuthorisationRequest` is gone; what the ACL
produces behind the boundary is the code's, and the model no longer names a shape nothing
at the boundary carries. The reaction walk now runs from the processor's call into
`AuthoriseCard` and on to `CardAuthorised`, `GetAvailableBalance` and `ScoreTransaction`,
where before it ran into an event nobody makes.

Six consumptions named an operation as what takes a foreign fact in. An operation is issued,
not woken, so each of them pointed at something that does nothing when the fact arrives, and
`consumption-by-reactor` now refuses it. Four became the reaction that was missing:

- Accounts hears `CustomerVerified` and **notes the verified customer**
  (`RecordVerifiedCustomer`); `OpenAccount` reads that list when a channel asks for a
  product, which is what "only then can an account be opened" means.
- Fraud hears `CardAuthorised` and **files it in the history the scorer reads**
  (`RecordCardAuthorisation`); `ScoreTransaction` reads that history.
- The Scheme Gateway hears the scheme's `SchemeSettlementConfirmed` and `SchemeRejected` and
  **matches each to the message it answers** (`RecordSchemeResponse`); the submission that
  is waiting is answered from what the match recorded. The scheme answers "on its own
  timings", so the fact really is a fact, and the operation that waits was never what heard
  it.

One came out. Credit Decisioning's consumption of `ApplicationSubmitted` was written so that
the Lending partnership would show traffic both ways; Decisioning does not subscribe to it
at all, it is called through `RequestDecision` by Lending's own policy, and a partnership
needs traffic in one direction only.

The deliberate diagnostics of section 7 are untouched: the same four, for the same reasons.
