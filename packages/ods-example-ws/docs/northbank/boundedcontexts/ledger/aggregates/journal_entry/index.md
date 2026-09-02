

# JournalEntry
Postings that balance; the whole entry posts or nothing does

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **JournalEntry** | One balanced movement of money | **entryId**: `string`, postedAt: `date-time`, reversalOf: `string` |
| Entity | Posting | A debit or credit of an amount to one account | **postingId**: `string`, accountId: `string`, amount: `Money`, direction: `PostingDirection` |
| Value Object | Money | Minor units and an ISO 4217 code. Never a float; the shared kernel library is the one implementation | amountMinor: `int64`, currency: `ISO 4217 code` |
| Value Object | PostingDirection | debit or credit | value: `'debit' | 'credit'` |
| Value Object | ValueDate | The date the money counts from, which may differ from the posting date | value: `date` |


## Relationships
| Source | Description | Target | Relation | Cardinality |
| --- | --- | --- | --- | --- |
| [JournalEntry](entities/journal_entry/index.md) | made-of | JournalEntry - Posting | includes | 1..* |
| [Posting](entities/posting/index.md) | of | JournalEntry - Money | uses | 1 |
| [Posting](entities/posting/index.md) | as | JournalEntry - PostingDirection | uses | 1 |
| [Posting](entities/posting/index.md) | to-account | Account - Account | references | 1 |
| [Account](../../../accounts/aggregates/account/entities/account/index.md) | operated-under | Account - Mandate | includes | 1..* |
| [Mandate](../../../accounts/aggregates/account/entities/mandate/index.md) | held-by | Customer - Customer | references | 1 |
| [Customer](../../../customer_&_kyc/aggregates/customer/entities/customer/index.md) | verified-by | Customer - IdentityDocument | includes | * |
| [Customer](../../../customer_&_kyc/aggregates/customer/entities/customer/index.md) | born-on | Customer - DateOfBirth | uses | 1 |
| [Customer](../../../customer_&_kyc/aggregates/customer/entities/customer/index.md) | lives-at | Customer - Address | uses | 1 |
| [Customer](../../../customer_&_kyc/aggregates/customer/entities/customer/index.md) | has-status | Customer - KycStatus | uses | 1 |
| [Account](../../../accounts/aggregates/account/entities/account/index.md) | identified-by | Account - IBAN | uses | 1 |
| [Account](../../../accounts/aggregates/account/entities/account/index.md) | numbered | Account - AccountNumber | uses | 1 |
| [Account](../../../accounts/aggregates/account/entities/account/index.md) | balance | Account - Money | uses | 1 |
| [Account](../../../accounts/aggregates/account/entities/account/index.md) | overdraft | Account - OverdraftLimit | uses | 1 |
| [Account](../../../accounts/aggregates/account/entities/account/index.md) | has-status | Account - AccountStatus | uses | 1 |
| [JournalEntry](entities/journal_entry/index.md) | valued-on | JournalEntry - ValueDate | uses | 1 |


## Invariants
| Name | Description | Constrains |
| --- | --- | --- |
| EntryBalances | The debits of an entry equal its credits, or it does not post | Posting |
| AtLeastTwoPostings | An entry has at least two postings | JournalEntry |
| SingleCurrencyPerEntry | Every posting in an entry shares one currency | Money |
| ImmutableOncePosted | A posted entry is never changed; it is reversed by another entry | JournalEntry |


## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| EntryPosted | event | no | published-language | Money moved; balances and reports follow | [EntryPosted](../../index.md#schemas) | - |
| PostEntry | operation | no | open-host-service | Post a balanced entry | [PostEntry](../../index.md#schemas) | EntryPosted |
| ReverseEntry | operation | no | open-host-service | Post the opposite entry against an earlier one | [PostEntry](../../index.md#schemas) | EntryPosted |
| ImportBatchPostings | operation | yes | - | Translate each line of Sovereign's batch file into an entry | - | EntryPosted |


## Consumes

### NightlyBatchCompleted [anti-corruption-layer]
The day's savings movements are in the batch file
- **Provider**: [SavingsAccountRecord](../../../sovereign_core_(legacy)/aggregates/savings_account_record/index.md)

	
