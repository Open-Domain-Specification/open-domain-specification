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
- "Do they share actual code or tables that both change?" → `shared-kernel`.
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
  relationship, and it is the only way one context may name another's value object.
- "What identifies it: an order number, an email?" → an attribute with `identity: true`.
- "What details does it carry?" → attributes, with `type` in the user's words.
- "Which of these do you always change or check together? What must be true across all of
  them at once?" → the aggregate boundary. The thing they state the rule about is the root.
  Explain once: an aggregate is the cluster you change together and check rules across; the
  root is the one you name it after.
- "What must never be allowed to happen to a <root>?" → invariants, each constraining the
  entity, value object or attribute it is about.
- "Does a <root> point at things in another cluster, for example an order pointing at a
  product?" → first ask "is that other cluster inside this same part of the business, or
  somewhere else?" Inside the same context → `references` to that cluster's root; ask "one
  or many?" for cardinality. In another context → no relation at all: ask "which id does it
  hold?" and add that as an attribute, then pick the dependency up in Phase F as a
  consumable the source consumes. Explain once: a relation is one model's object graph, and
  two contexts are two models, so only the id crosses.
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
- For an operation, follow up: "and what comes back?" → a second schema on the same context,
  attached with `returns`. A command that answers with nothing leaves `returns` off; a query
  that answers with nothing is not a query, so keep asking. Never put `returns` on an event.
- "When <event> happens, what do you then do automatically?" → a policy with `on` the event
  and `then` the operation. The event in `on` may belong to another context, because reacting
  to a published fact is a consumption; the operation in `then` is always the policy's own
  context's. To act on a neighbour, name a local operation that consumes theirs.
- "Who outside this part listens for <event>?" → a consumption on their aggregate or service,
  with a downstream `pattern`.
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
