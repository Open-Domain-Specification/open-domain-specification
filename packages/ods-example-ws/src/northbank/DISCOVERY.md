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
`PurposeRequired`, `OpenBankingConsentExpires`; the KycScreening domain service; policies
"Screen on onboarding" and "Hold on sanctions match"; `CustomerVerified`, `ConsentGiven`
and `ConsentWithdrawn` published with schemas; the glossary entry for Customer with aliases
Member and Party.

### Financial Crime lead (sanctions)

"We screen a name, date of birth and country against the lists, and return a match score.
The lists are bought; the screening engine is bought; the API is documented. If someone
matched we say so and the caller stops."

Recorded as: Sanctions Screening as generic; `ScreenParty` as an open host operation with a
schema, raising `PartyMatched`.

### Accounts Team lead

"An account is the product: a current account or a savings account, with an account number
and an IBAN, a status of open, frozen or closed, an overdraft limit and mandates saying
which verified customers can operate it. Rules: the IBAN checksum must be valid or the
account doesn't exist; the balance never goes below minus the overdraft limit; a frozen
account accepts no debits; a closed account has a zero balance; every mandate holder is a
verified customer. We freeze when Financial Crime opens a case. Our balance is the
available balance, which is ledger balance less pending card authorisations; the ledger
people say balance and mean the posted one, and the contact centre says balance and means
whatever the screen shows. Money and account numbers are one shared library between us and
the ledger; we change it together and release it together."

Recorded as: Accounts as core; the Account aggregate with Mandate `includes`, IBAN,
AccountNumber, Money, OverdraftLimit and AccountStatus; five invariants; `OpenAccount`,
`FreezeAccount` and `GetAvailableBalance` as open hosts; the "Freeze on fraud case" and
"Update balance on posting" policies; a shared kernel with Ledger; the glossary entry for
Balance with the three meanings.

### Core Banking lead (ledger and Sovereign)

"A journal entry is at least two postings, each a debit or a credit of an amount to an
account, and the debits equal the credits or it doesn't post. One currency per entry. Once
posted an entry is never changed; you reverse it with another entry. Payments, lending and
the accounts platform post through our API, and they're consulted before we change it.
Sovereign still holds savings and runs the nightly batch; the batch file is how we learn
about savings movements, and we translate every line of it. Nobody touches Sovereign's
tables. It is what it is."

Recorded as: Ledger as supporting; JournalEntry with Posting `includes`, Money,
PostingDirection and ValueDate; invariants `EntryBalances`, `AtLeastTwoPostings`,
`SingleCurrencyPerEntry`, `ImmutableOncePosted`; `PostEntry` and `ReverseEntry` as open
hosts; `EntryPosted` published; the "Import nightly batch" policy translating the legacy
event; Sovereign Core (legacy) flagged as a big ball of mud with `NightlyBatchCompleted`
as its one published event.

### Payments Hub lead

"An instruction is a customer telling us to pay a payee an amount on a date. Payer and payee
can't be the same account, the amount is positive, there's a daily limit per account, and if
the execution date is today it has to be before the scheme cut-off. Every instruction is
scored by fraud before it goes anywhere; flagged means rejected, never submitted. Cleared
means we submit to the scheme through the gateway, in the scheme's format exactly, because
you don't negotiate with a scheme. When settlement is confirmed we post to the ledger. We
say instruction; cards say payment and mean a card transaction; the branches say transfer."

Recorded as: Payments as supporting; PaymentInstruction with Payee, Money, ExecutionDate
and PaymentStatus; invariants `PayerNotPayee`, `AmountPositive`, `DailyLimit`,
`CutOffRespected`, `FlaggedNeverSubmitted`; seven policies chaining
`PaymentInitiated` → `ScoreTransaction`, `TransactionCleared` → `SubmitPayment`,
`TransactionFlagged` → `RejectPayment`, `PaymentSubmitted` → `SubmitToScheme`,
`SchemeSettlementConfirmed` → `ConfirmSettlement`, `SchemeRejected` → `RejectPayment`,
`PaymentSettled` → `PostEntry`;
conformist consumption of the scheme gateway; customer-supplier towards Ledger.

### Scheme Connectivity lead

"We turn a submission into a scheme message and send it. The scheme confirms or rejects.
ISO 20022 now. Our API to the hub is documented; the hub takes our format as it is."

Recorded as: Scheme Gateway as generic; SchemeMessage with SchemeFormat; `SubmitToScheme`
as an open host raising `SchemeSettlementConfirmed` and `SchemeRejected`.

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
the latter with RepaymentSchedule and Installment `includes`; invariants
`OneOpenApplicationPerCustomer`, `NoDrawdownBeforeSignature`, `AprWithinCap`,
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
invariants `CaseHasAlert` and `ScoreExplained`; the TransactionScorer domain service with
`ScoreTransaction` raising `TransactionFlagged` and `TransactionCleared`; `FraudCaseOpened`
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
| TransactionFlagged / Cleared | ScoreTransaction | Reject / submit; open case; block card |
| FraudCaseOpened | OpenCase | Freeze account |
| PaymentSubmitted (internal) | SubmitPayment | Submit to scheme |
| SchemeSettlementConfirmed / Rejected | SubmitToScheme | Confirm settlement |
| PaymentSettled / Rejected | ConfirmSettlement / RejectPayment | Post to ledger |
| EntryPosted | PostEntry / ReverseEntry | Accounts updates balance; Reporting accumulates |
| NightlyBatchCompleted | Sovereign batch | Ledger imports; Reporting accumulates |
| CardAuthorised / CardBlocked | AuthoriseCard / BlockCard | Fraud monitors |
| ApplicationSubmitted | SubmitApplication | Decide |
| DecisionMade | Decide | Record decision |
| LoanApproved / ApplicationDeclined (internal) | RecordDecision | (offer, out of scope) |
| LoanAgreementSigned (internal) | SignAgreement | Disburse |
| LoanDisbursed | Disburse | Post to ledger; Reporting accumulates |
| InstallmentMissed | MarkInstallmentMissed | (arrears rule, mis-written) |
| CustomerAuthenticated | AuthenticateCustomer | Contact centre proceeds |

## 4. Language collisions

- **Customer / Member / Party.** One record, three names; aliases on the Customer term.
- **Balance.** Available (Accounts), posted (Ledger), "what the screen shows" (Channels).
  Accounts owns the term and defines the other two against it.
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

## 6. The context map

- **Shared kernel** between Accounts and Ledger: the Money and AccountNumber library both
  teams change and release together. Each context still declares its own value objects.
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
  Sanctions).

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

Mortgages beyond the shared origination flow, interest calculation and accruals, statements
and notifications, treasury and liquidity, open banking APIs beyond consent, the data
warehouse, HR and branch operations, complaint handling as a separate process, and
everything inside Sovereign beyond its nightly batch. Each is a further session with its
own owner.
