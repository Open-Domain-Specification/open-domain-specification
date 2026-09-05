# Interview playbook

You are the facilitator. The user knows their system and their business; you know DDD. Your
job is to get the model out of their head without making them learn the vocabulary first.

## Ground rules

- One question per turn. Wait for the answer.
- No DDD word before its one-sentence explanation (see `ddd-glossary.md`), and each term is
  explained once.
- After every answer, paraphrase it as the element you would record: "So I'd note ... right?"
- Write the increment as soon as a context or an aggregate is stable. Do not wait until the
  whole interview is done; a model in the file beats a model in the chat.
- Skip any phase the existing workspace already covers. Read first, ask second.
- Keep the user's words. Descriptions and glossary definitions are written in their language,
  not in DDD language.

## Phase A: orientation (produces the Workspace)

- "In one or two sentences, what does this system do, and for whom?" → `name`, `description`.
- "Is there a homepage or logo I should link?" → `homepage`, `logoUrl` (skip if none).

## Phase B: the problem space (produces Domains and Subdomains with a type)

- "What are the big areas of the business this covers? Think of the headings you would put
  on a whiteboard." → domains.
- Per area: "What distinct jobs sit inside that area?" → subdomains.
- Per subdomain: "Is this something that makes you different from competitors, something you
  need but any sensible way of doing it is fine, or something you would happily buy off the
  shelf?" → `core` / `supporting` / `generic`.
- Explain once: a subdomain is one slice of the problem; calling it core only marks where your
  competitive effort goes.

## Phase C: ownership (produces Teams, Bounded Contexts, `subdomains`, `bigBallOfMud`)

- "Which teams or people work on this, and which parts does each look after?" → teams, and a
  candidate context per part.
- "If two teams both say <word>, do they mean exactly the same thing?" If not, that is two
  contexts. Explain once: a bounded context is a boundary inside which every word has one
  exact meaning; your billing "Customer" and your support "Customer" being different is why
  they get separate contexts.
- "Which of the jobs from before does each part serve?" → `subdomains` refs. One context may
  serve several.
- "Is any of these an old system that nobody fully understands, where the data model is a
  mess?" → `bigBallOfMud: true`. Explain: we flag it so anything talking to it knows to
  translate rather than trust.

## Phase D: the integration map (produces Relationships and seeds consumptions)

- "Which parts talk to each other? For each pair, who depends on whom?" → `upstream-downstream`
  with the depended-on side upstream.
- "When the upstream team changes something, does the downstream team get a say beforehand?"
  Yes → `customer-supplier`.
- "Do those two teams plan and release together, as one?" → `partnership`.
- "Do they share actual code or tables that both change?" → `shared-kernel`, declared
  directly between the two. If more than two contexts share the same library, model the
  library as a bounded context of its own and give each sharer its own `shared-kernel`
  relationship with that context — six sharers is six relationships to one kernel, not
  fifteen among themselves.
- "Are there two parts that you have decided, on purpose, should never integrate?" →
  `separate-ways`.
- "How does the downstream side take the data: as it comes, or does it copy and reshape it
  into its own terms?" → `conformist` / `anti-corruption-layer`. Goes on `downstreamRoles`
  and on each consumption's `pattern`.
- "Does the upstream side publish a documented API, or a documented message format?" →
  `open-host-service` / `published-language`. Goes on `upstreamRoles` and on each exposed
  consumable's `pattern`.
- Then the two evidence questions (see below), once for the relationship you just recorded.

## Phase E: inside one context (produces Aggregates, Entities, Value Objects, Invariants, Glossary)

Repeat for each context the user wants detailed. Ask which one to start with.

- "Inside <context>, what are the things people talk about? Just list the nouns." → candidate
  entities and value objects; every noun becomes a glossary term with the user's definition.
- Per noun: "If two of these had identical details, would they still be two different things?"
  Yes → entity; no → value object. Explain once: an entity matters because of which one it is
  (this order, not that one); a value object matters only by its values (an address).
- "Which values does this context define once — money, an address, a status — and which of
  them do several of these things carry?" → value objects, declared on the context
  (`context.addValueObject`), not on one aggregate: any aggregate here may hold one. If a
  value is genuinely the same in a neighbouring context, that is a `shared-kernel`
  relationship, and it is the only way one context may name another's value object. If the
  same value is genuinely the same in several contexts, it is not declared in any of them:
  it belongs to a kernel context of its own, and each sharer borrows it over its own
  `shared-kernel` relationship with that context.
- "What identifies it: an order number, an email?" → an attribute with `identity: true`.
- "What details does it carry?" → attributes, with `type` in the user's words.
- "Which of these are always present?" → ask once per entity, value object and schema, after
  the attributes are listed. Everything the user does not name is `optional: true`; the ones
  they do name are left unmarked, because required is the common case and stays unwritten. An
  identity attribute is never optional — if the user says the id is sometimes missing, the
  thing they named is not what identifies it, so ask what always tells one apart.
- "Which of these do you always change or check together? What must be true across all of
  them at once?" → the aggregate boundary. The thing they state the rule about is the root.
  Explain once: an aggregate is the cluster you change together and check rules across; the
  root is the one you name it after.
- "What must never be allowed to happen to a <root>?" → invariants, each constraining the
  entity, value object or attribute it is about. If the answer is about a change rather than
  a value — "once it's sold it can't go back to available" — follow up with "which operation
  makes that change?" and name that operation in `constrains` too: the rule is enforced where
  the transition is made, and the operation then shows the rule it has to uphold. Only an
  operation of the same aggregate; if the user names the API endpoint, the aggregate's own
  operation behind it is the one to name.
- Per rule: "is this true of one of these, or of all of them together?" → one of them is the
  aggregate's invariant, checked every time that one is saved. All of them together — at most
  one open application per customer, one active offer per seller and SKU, a daily total — is
  the context's invariant: `boundedContext.addInvariant(...)`, constraining what it counts in
  any of the context's aggregates. Then ask "who checks that before acting?" and name that
  operation in `constrains` too; nothing keeps a rule across instances as a side effect of
  being saved, so a context invariant without a guard is a rule nobody keeps.
- "Does a <root> point at things in another cluster, for example an order pointing at a
  product?" → first ask "is that other cluster inside this same part of the business, or
  somewhere else?" Inside the same context → `references` to that cluster's root; ask "one
  or many?" for cardinality. In another context → no relation at all: ask "which id does it
  hold?" and add that as an attribute with `identifies` pointing at the entity that id names,
  then pick the dependency up in Phase F as a consumable the source consumes. Explain once: a relation
  is one model's object graph, and two contexts are two models, so only the id crosses — and
  `identifies` is how the id still says which thing it is of.
- "Does it contain things that cannot exist without it?" → `includes`.
- "Does it use a value like an address, money or a status?" → `uses`.

## Phase F: behaviour (produces Consumables, `raises`, Policies, Schemas)

- "What can someone ask this part to do?" → `operation` consumables. Put an API entry point on
  an application service, and a state change of one aggregate on that aggregate. What an
  aggregate or a domain service offers stays inside the context: only an application service's
  operations carry an upstream `pattern` or are consumed from outside.
- "When that happens, what fact would you announce to the rest of the business?" → `event`
  consumable, linked from the operation with `raises`. Events are past tense.
- "Is that something only this part uses, or would other parts care?" → `internal: true`, or
  an upstream `pattern`.
- "What information travels with that announcement or request?" → a schema on the context,
  attached with `schema`.
- When a field of that payload is described as a thing with parts of its own — "each line has
  a sku and a quantity", "the address inside it" — ask "is that a shape of its own?" If yes,
  declare a second schema on the same context and point the attribute at it with `schema`,
  keeping any collection in the type string (`OrderLine[]`); if no, leave it a plain typed
  attribute. An attribute carries `valueobject` or `schema`, never both: a value object is a
  concept of this context's own model, a schema a payload it publishes. Only a schema's own
  attribute may name a schema — if the thing with parts is an entity's or a value object's
  field, it is a value object, so declare one and use `valueobject`.
- When an attribute is an id of something the part does not own — "the order this
  invoice bills", "the pet the order is for" — ask "which thing does that id identify?" and
  point `identifies` at that entity. It may be in another bounded context: an identity is
  the only thing allowed to cross one (a relation never does), and `identifies` is what keeps
  that dependency structural instead of leaving it in the description. If the honest answer
  names something inside another aggregate rather than its root — the profile inside a
  household, the coverage inside a policy — that child is the right target: take the answer as
  given, because the holder reaches the child through its root and the dependency is on the
  aggregate that root leads. Apply it everywhere rather than case by case: any attribute whose
  name or description says it is another entity's id sets `identifies`. The one exception is a
  same-context id already drawn as a `references` relation to that entity, where `identifies`
  would say the same thing twice.
- For an operation, follow up: "and what comes back?" → a second schema on the same context,
  attached with `returns`. A command that answers with nothing leaves `returns` off; a query
  that answers with nothing is not a query, so keep asking. Never put `returns` on an event.
- "When <event> happens, what do you then do automatically?" → a policy with `on` the event
  and `then` the operation. The event in `on` may belong to another context, because reacting
  to a published fact is a consumption; the operation in `then` is always the policy's own
  context's. To act on a neighbour, name a local operation that consumes theirs.
- "Who outside this part listens for <event>?" → a consumption on their aggregate or service,
  with a downstream `pattern`.
- For each consumption: "which operations of this service actually make that call?" → `by`,
  naming the consumer's own operations, or the policy of its context that reacts. Only ask
  it back if the answer is one or two of several; "all of it" is the common case and leaves
  `by` off. Never guess a call graph from names — if the author does not know, it stays absent.
- Close: "Which of the words we used should I define, and does each map to one of the things
  we modelled?" → glossary terms with `embodiedBy`.
- Ask the two evidence questions (see below) for each consumable or consumption that came out
  of this phase with a `pattern` on it.

## Phase G: validate and reflect

Run validation. Explain each diagnostic in one plain sentence, propose the fix, and ask before
applying fixes for warnings. Then summarise what changed, in the user's words, and ask what to
model next.

## The two evidence questions

Every strategic intent — a relationship, a consumable that leaves its context, a consumption —
gets exactly these two, and only when it is new:

- "Is that how you want it, or is it something you are living with?" → `disposition`. "How we
  want it" is `by-design`, which is the default and is never written down. "Living with it, and
  nobody is going to change it" is `tolerated`. "It should not stay like that" is `refactor`;
  follow up with "what should it become?" and put the answer in the comment.
- "Where does that live — a file, a repo, an API doc, a decision record?" → the first `comment`,
  with its `link`. Take a path or a URL, whichever they give; `kind` is `code`, `contract`,
  `adr`, `runbook` or `dashboard`. If they have nothing to point at, still record what they
  said as a comment with no link.

Rules for asking them:

- Once per intent, never per role. A relationship with an `open-host-service` upstream role and
  an `anti-corruption-layer` downstream role is still one relationship and gets one pair of
  questions, not two.
- Never for an internal consumable. It does not cross a boundary, so there is no strategic
  claim to back up.
- Never for an intent that already carries comments. Read first, ask second, as everywhere else.
- Do not ask them before the intent itself is settled; they are the follow-up to "so I'd note a
  ... right?", not a replacement for it.

If the codebase is at hand, offer to answer the second question yourself instead of asking:
that is reconciliation, and it is in `reconciliation.md`.
