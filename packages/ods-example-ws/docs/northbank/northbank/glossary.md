

# NorthBank Glossary

## [Customer & KYC](../boundedcontexts/customer_&_kyc/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Customer** | A verified person. Branches say member; payments say party | Member, Party | Customer |
| **KYC** | Know your customer: the verification that must pass before any account opens | - | KycStatus |
| **Consent** | A permission with a purpose, a scope and a lifetime; withdrawal is final | - | Consent |


## [Accounts](../boundedcontexts/accounts/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Account** | A current or savings product held by one or more verified customers | - | Account |
| **Balance** | The available balance: posted balance less pending card authorisations. The ledger's balance is the posted one; the contact centre's is whatever the screen shows | Available balance | availableBalance |
| **Mandate** | A customer's authority to operate an account. Not a card authorisation | - | Mandate |


## [Ledger](../boundedcontexts/ledger/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Posting** | One side of a movement: a debit or credit to one account | - | Posting |
| **Entry** | A balanced set of postings. Lending calls the disbursement one a drawdown | Journal | JournalEntry |
| **Value date** | The date money counts from, which may differ from when it was posted | - | ValueDate |


## [Payments Hub](../boundedcontexts/payments_hub/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Instruction** | A customer's request to pay. Cards say payment and mean a card transaction; branches say transfer | Payment, Transfer | PaymentInstruction |
| **Payee** | Who gets paid: a name and an IBAN | Beneficiary | Payee |
| **Settlement** | The scheme's confirmation that the money moved | - | PaymentSettled |


## [Cards](../boundedcontexts/cards/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **PAN** | The card number; held as a token and the last four digits | - | PAN |
| **Authorisation** | A merchant's approved request to take an amount. Not a mandate | - | Authorisation |
| **Payment** | A card transaction. The Payments Hub's payment is an instruction to a payee | - | Authorisation |


## [Lending](../boundedcontexts/lending/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Loan** | Money lent under a signed agreement, repaid by a schedule | - | Loan |
| **Drawdown** | Paying the principal to the customer. The ledger calls it a posting | Disbursement | Disburse |
| **Arrears** | At least one installment missed | - | LoanStatus |


## [Credit Decisioning](../boundedcontexts/credit_decisioning/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Scorecard** | The bank's own credit model | - | Scorecard |
| **Decline reason** | A code the customer is entitled to see when refused | - | CreditScore |


## [Fraud](../boundedcontexts/fraud/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Alert** | One flagged transaction and its score | - | Alert |
| **APP scam** | An authorised push payment the customer was tricked into making; reimbursable, so every missed flag costs the bank | - | TransactionScorer |


## [Regulatory Reporting](../boundedcontexts/regulatory_reporting/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Return** | A report to the regulator. The branches' 'return' is a returned payment | - | RegulatoryReturn |
| **Reporting period** | The month or quarter a return covers | - | ReportingPeriod |


## [Branch & Contact Centre](../boundedcontexts/branch_&_contact_centre/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Request** | One customer ask tracked to an outcome | Ticket | ServiceRequest |
| **Returned payment** | A payment sent back by the payee's bank. Not a regulatory return | - | ServiceRequest |


