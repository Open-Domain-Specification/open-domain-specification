# StreamLine: discovery record

How the model in `workspace.ts` was arrived at, following the interview playbook in the
ODS skill: orientation, problem space, ownership, integration map, then each context's
inside and behaviour, then validation. Interview summaries are composites written in the
voice of the role.

## 1. Orientation

The CPO office's one sentence: "We make and license the things people want to watch, and
we play them perfectly, personally, on anything." That gave the three core areas (the
slate, personalisation, playback) and set the interview order: content first, because
everything downstream reacts to it; then the streaming platform; then members and money;
then ads last, because its main property is what it is not connected to.

## 2. Stakeholder interviews

### Head of Studio Technology

"A production is a project with a working title, a budget and, for series, episodes. It is
greenlit, shot, and eventually delivers masters: one mezzanine file per episode or film, to
our delivery spec. No shoot starts before the budget is approved, and episode numbers within
a production are unique because the delivery spec keys on them. When a master is delivered
we announce it with the production id, the episode, the file location and the runtime; the
catalogue and the encoding pipeline both react. Our delivery portal is the documented way
in; external post houses use it too."

Recorded as: Studio Production serving the core "Studio Production" subdomain; Production
with Episode `includes` and Budget; invariants `BudgetApprovedBeforeShoot` and
`EpisodeNumbersUnique`; `MasterDelivered` as a published-language event with a schema;
StudioPortal as an open host; glossary Master (alias Mezzanine).

### Head of Content Acquisition

"A deal is with a licensor, for a term. Inside it are windows: a territory, a start, an
end, and whether we're exclusive. A window can't extend past the deal term, and two windows
for the same territory can't overlap or we've paid twice. When a window opens the title
should be available in those countries; when it expires it must come down, that day, or we
are in breach. We say territory; the platform people say region and mean something
completely different, their cache regions. We publish window opened and window expired
with the title and the territories."

Recorded as: Licensing as core; LicenseDeal with Window `includes`, Territory and Fee;
invariants `WindowWithinTerm` and `NoOverlappingWindowsPerTerritory`; two published events
with schemas; the Territory glossary entry noting the Region collision.

### Catalogue Team lead

"A title is a film or a series; a series has seasons and seasons have episodes. The studio
also says episode, but theirs is a production artefact and ours is what a member sees, with
artwork and a rating; they're different things and we key ours differently. A title can't
be published until it has a playable encode and a maturity rating, and its availability in a
country has to match a licence window. We react to four things: a master arriving means we
ask for an encode; an encode completing means we can publish; a window opening means we
update availability; a window expiring means we unpublish. Everything comes in through our
own translation; nobody else's model gets into our tables. We expose a documented read API
that Playback uses."

Recorded as: Catalogue as supporting; Title with Season and Episode `includes`, Artwork,
MaturityRating and Availability; invariants `PublishedTitleHasPlayableAsset`,
`RatingRequiredBeforePublish`, `AvailabilityMatchesLicence`; four policies; anti-corruption
consumptions of Studio, Licensing and Encoding; customer-supplier towards Encoding
because Catalogue is the caller of `SubmitEncode`.

### Media Engineering lead

"A job takes a source and produces renditions: codec, bitrate, resolution, each a rung on a
ladder. We plan the ladder per title; a talking-heads drama needs fewer bits than an action
film at the same quality, which is a real cost and quality difference. Every ladder has a
rung under 300 kilobits so a stream starts on a bad network. We consume the studio's
delivery spec as it is; it's the industry format and translating it would be pointless.
When a job completes we publish the rendition list; edge delivery pre-positions the
popular ones and the catalogue publishes the title."

Recorded as: Encoding as core; EncodingJob with Rendition `includes` and Ladder; invariants
`LadderHasLowestRung` and `RenditionsMatchLadder`; PerTitleLadderPlanner domain service;
`SubmitEncode` as an open host operation; `EncodingCompleted` published with a schema; a
conformist consumption of `MasterDelivered`.

### Playback engineering lead

"A session is one profile watching one title on one device. Starting it needs an
entitlement from billing; we ask them and translate the answer into our own yes/no. The
manifest lists the renditions and the edge to fetch from; we resolve the edge through the
shared library, so we take that answer as it is. The bitrate selector picks a rung as the
network changes. The bookmark, the resume point, is ours; the player updates it every few
seconds and that update is internal, it's not a business fact. Stopped is a business fact:
profile, title, how much was watched, whether it finished. Devices: we don't start a session
on a device that isn't certified against the current SDK; we plan releases with the devices
team as one. On the ads plan we tell the ads service a session has started, and when the
player reaches a break we ask them what goes in it." (An earlier draft of this summary
said the breaks were asked for before the start; the Ads lead's account is the one both
teams confirmed, and the model follows it.)

Recorded as: Playback as core; PlaybackSession with Bookmark and StreamManifest; invariants
`SessionNeedsEntitlement` and `BookmarkWithinRuntime` on the aggregate and
`WithinStreamLimit` on the context, guarded by `StartPlayback`; the
AdaptiveBitrateSelector domain service; `PlaybackStarted` and `PlaybackStopped` published,
`BookmarkUpdated` internal; anti-corruption consumptions of Billing, Catalogue and Ads;
conformist consumption of Edge's `ResolveEdge` (shared kernel) and Devices'
`DeviceCertified` (partnership).

### Edge Delivery lead

"An appliance is a box in an ISP's network. It caches renditions and we tell it what to
pre-position when an encode completes, based on predicted popularity. Cached bytes can't
exceed capacity, obviously, so pre-positioning evicts. The manifest and segment formats are
one library that we and Playback both change; we tried splitting it and reverted. Region
here means our cache region, nothing to do with licensing territories."

Recorded as: Edge Delivery as core; EdgeAppliance with CachedAsset `includes` and Capacity;
`CachedBytesWithinCapacity`; `ResolveEdge` as an open host; the "Preposition on encode"
policy; shared kernel with Playback; glossary Region.

### Head of Personalisation

"Every profile has a taste profile: signals from what it watched and how far, and affinities
we derive. Signals come only from that profile, never another profile in the household. The
home screen is rows; the ranker orders them. We consume playback stopped, new profiles and
new titles. We also started reading the player's bookmark updates to make 'continue
watching' fresher; Playback aren't happy about it. And to be absolutely clear, nothing from
advertising comes anywhere near us, and nothing of ours goes to them. That's a public
commitment."

Recorded as: Recommendations as core; TasteProfile with Signal `includes` and Affinity;
invariants `SignalsFromOwnProfileOnly` and `NoAdvertisingSignals`; the Ranker domain
service; `GetHomepageRows` as an open host; the "Record signal on stop" policy; the
consumption of `BookmarkUpdated` kept as found (section 7); separate ways with Ads.

### Member Experience lead

"A household is the paying unit; it has up to five profiles and exactly one primary. A kids
profile has a maturity cap that can't be raised without the PIN. The household is created
when an account is created; we react to identity's event. People say account when they mean
household and vice versa; identity's account is the login, ours is the people."

Recorded as: Households & Profiles as supporting; Household with Profile `includes`,
MaturitySetting and ProfilePin; invariants `MaxFiveProfiles`, `OnePrimaryProfile`,
`KidsProfileMaturityCapped`; `HouseholdCreated` and `ProfileCreated` published; the "Create
household on account" policy; glossary Household (alias Account) recording the collision.

### Commerce lead

"A subscription is a household on a plan. One active subscription per household, no
exceptions. A plan is a tier: price, how many streams at once, whether it's ad-supported.
Each period we invoice, and the subscription line on the invoice equals the plan price, full
stop; anything else on the bill, like the disc charge, is its own line. If the
charge fails we start dunning; if dunning fails the subscription lapses and there's no
entitlement. Playback asks us for entitlement and they're our main customer; they get
consulted on changes. The disc business posts a monthly charge to us through an export; we
translate it into an invoice line. We would happily buy all of this."

Recorded as: Billing & Plans as generic; Subscription with Invoice `includes`, Plan, Price
and BillingPeriod; invariants `SubscriptionLineEqualsPlanPrice` and `NoEntitlementWhenLapsed`
on the aggregate and `OneActiveSubscriptionPerHousehold` on the context, guarded by
`StartSubscription`; `GetEntitlement` as an open
host; policies "Await plan on household", "Dun on failed payment" and "Add disc charge to
bill"; customer-supplier towards Playback; anti-corruption consumption of the legacy event.

### Partner Devices lead

"A device model is registered by a partner with its capabilities: codecs, DRM level, max
resolution. We certify it against an SDK version; no certification, no playback. When a new
SDK ships we're supposed to recertify everything and we've been meaning to automate that;
there's a half-written rule for it."

Recorded as: Devices as supporting; Device with Certification `includes` and Capability;
invariants `CertifiedBeforePlayback` and `CapabilitiesDeclared`; `DeviceCertified`
published; partnership with Playback; the half-written rule kept as found (section 7).

### Ads Team lead

"A break is a pod of slots at a position in a session. A break is at most ninety seconds,
a creative doesn't repeat within a break, and breaks only exist on the ad-supported plan.
Playback tells us a session started and we prepare the breaks; Playback asks us to resolve
a break when it reaches one. We record impressions and publish them for billing advertisers.
We asked for viewing signals and were told no; fine, we work with plan and country."

Recorded as: Ads Tier as supporting; AdBreak with AdSlot `includes`, Advertiser and
FrequencyCap; three invariants; `ResolveAdBreak` as an open host; `AdImpressionRecorded`
published; the "Prepare breaks on start" policy; separate ways with Recommendations.

### Legacy Operations (StreamLine Discs)

"There's a queue per account, a shipping job, a returns job, and a monthly export of charges
to billing. I can tell you the export's shape. Please don't ask about the rest."

Recorded as: Disc Rental (legacy) as a big ball of mud with one aggregate and one published
event, `DiscRentalInvoiced`, with the export's shape as its schema.

### Identity Team lead

"Accounts and sign-in. Documented API, everyone takes it as it is."

Recorded as: Identity as generic; IdentityAPI with `CreateAccount` and `SignIn`;
`AccountCreated` published; conformist consumption by Households.

## 3. Event storming

One session per organisation (Content, Streaming Platform, Members), then a joint session
to connect them. The connected timeline, condensed:

| Event | Raised by | Reacted to by |
|---|---|---|
| ProductionGreenlit (internal) | Greenlight | (studio scheduling, out of scope) |
| MasterDelivered | SubmitDelivery | Catalogue requests encode; Encoding queues |
| EncodeQueued (internal) | SubmitEncode | Plan ladder |
| EncodingCompleted | CompleteJob | Catalogue publishes; Edge pre-positions |
| LicenseWindowOpened / Expired | OpenWindow / ExpireWindow | Catalogue updates availability / unpublishes |
| TitlePublished / TitleAvailabilityChanged | PublishTitle / UpdateAvailability | Recommendations adds candidate ("Add candidate on publish") |
| AccountCreated | CreateAccount | Create household |
| HouseholdCreated | CreateHousehold | Billing awaits plan ("Await plan on household") |
| ProfileCreated | CreateProfile | Recommendations creates taste profile |
| SubscriptionActivated / Lapsed | StartSubscription / LapseSubscription | (entitlement read on play) |
| PaymentFailed (internal) | ChargeRenewal | Start dunning |
| DiscRentalInvoiced | Discs monthly export | Add disc charge to bill |
| DeviceCertified | Certify | Playback allows device; (recertify rule, unfinished) |
| PlaybackStarted | StartPlayback | Ads prepares breaks |
| BookmarkUpdated (internal) | RecordHeartbeat | (Recommendations, unagreed) |
| PlaybackStopped | StopPlayback | Recommendations records signal |
| AdImpressionRecorded | RecordImpression | (advertiser billing, out of scope) |

## 4. Language collisions

- **Episode.** A production artefact (Studio) versus what a member sees (Catalogue).
  Two entities in two aggregates; the catalogue's carries artwork and a rating, the
  studio's carries a runtime and a master.
- **Territory / Region.** Licensing territory versus cache region. Two glossary entries,
  each naming the other as the thing it is not.
- **Account / Household.** The login (Identity) versus the paying unit and its people
  (Households). Separate contexts; alias recorded on Household.
- **Title.** The catalogue's title versus a production's working title; only the catalogue
  owns Title.
- **Rendition / Profile.** Media Engineering says rendition; some older docs say profile,
  which collides with member profiles. Alias recorded on Rendition.
- **Break / Pod.** Ads people say pod; the player says break. Alias recorded.

## 5. Classification

| Subdomain | Type | Reasoning |
|---|---|---|
| Studio Production | core | The slate is the product; originals are the exclusive part of it |
| Licensing | core | Exclusive windows are fought over; the deal terms are the differentiator |
| Encoding | core | Per-title ladders are a real quality and cost advantage |
| Playback | core | "We play them perfectly" |
| Edge Delivery | core | Caches inside ISPs are why streams start in under a second |
| Recommendations | core | The strongest lever on retention |
| Catalogue | supporting | Must be excellent and boring; sequencing, not differentiation |
| Devices | supporting | Necessary partner work; no member notices it |
| Households & Profiles | supporting | Rules matter; nothing unique |
| Ads Tier | supporting | New, growing, still "fill the break"; may become core |
| Physical Rental | supporting | Kept alive by decision, not investment |
| Billing & Plans | generic | "We would happily buy all of this" |
| Identity | generic | "Everyone takes it as it is" |

## 6. The context map

- **Shared kernel** between Playback and Edge Delivery: one format library both teams
  change; the 2019 split-and-revert settled it.
- **Partnership** between Playback and Devices: SDK and player versioned and certified
  together, releases planned as one.
- **Separate ways** between Ads Tier and Recommendations: a public commitment, enforced by
  having no integration at all.
- **Customer-supplier** where the downstream is consulted: Catalogue towards Encoding (it is
  the caller of `SubmitEncode`), Playback towards Billing (entitlement contract).
- **Upstream-downstream** for every other consumption, with the stance each side described:
  Encoding conforms to the studio's delivery spec; Catalogue translates everything;
  Recommendations conforms to Catalogue and Households but translates Playback; Billing
  translates the legacy export; Households conforms to Identity.
- Encoding is upstream of Catalogue for both exchanges (Catalogue calls `SubmitEncode` and
  reads `EncodingCompleted`); one customer-supplier relationship carries both roles.
- Playback and Ads Tier are each downstream of the other: the start event flows to Ads,
  the break lookup and the plan check flow back. Ads also asks Billing for the plan.

## 7. Validation and what we left in

Four diagnostics, each a finding the client asked to keep visible:

- `policy-complete` on Devices' "Recertify on SDK release": reacts to `DeviceCertified` and
  issues nothing. It is the half-written automation the Partner Devices lead mentioned.
- `schema-context` on Playback's `PlaybackStarted`: the event carries the catalogue's
  `TitleRef` schema instead of one of Playback's own. It was quicker to reuse; it ties the
  player's contract to the catalogue's.
- `internal-consumable` on Recommendations' consumption of `BookmarkUpdated`: the resume
  point update is internal to the player and the dependency was never agreed.
- `partnership-backed` on Playback and Devices: they ship on one release train and certify
  in the same lab run, but the only traffic is Playback consuming `DeviceCertified`;
  Devices consumes nothing of Playback's. The declaration is true: a partnership in DDD is
  two teams whose success is mutual and whose releases are planned as one, which is exactly
  what the player and the SDK have, and it does not require consumption in both directions.
  The rule over-claims, and decision 20's amendment relaxes it to traffic in at least one
  direction. This entry is listed here because it is what `validate()` prints today; it
  disappears when that change lands, and nothing about the model changes with it.

## 8. What the model leaves out

Search, artwork personalisation, subtitles and dubbing, DRM licence servers, content
moderation and ratings boards, advertiser billing, the data platform, marketing and
notifications, the studio's scheduling and payroll, and everything inside StreamLine Discs
beyond its monthly export. Each is a further session with its own owner.

## 9. Peer review

An independent review of the model was taken as a second opinion. Each finding is listed
with the outcome. The three deliberate problems in section 7 were out of bounds for the
review and are unchanged; the workspace still reports exactly those three.

Accepted

- Missing episode identity in Playback: a series is watched an episode at a time, and the
  bookmark is per episode. Changed: `episodeId` (absent for a film) on PlaybackSession,
  `StartPlayback` and `PlaybackStopped`.
- Invoice invariant contradicted the disc policy: "invoice equals plan price" and "add the
  disc charge as a line" cannot both hold. The Commerce lead's summary was the thing at
  fault (the rule is about the subscription line); it is corrected above. Changed: the
  invariant is `SubscriptionLineEqualsPlanPrice`, Invoice has `lines` and `amount` is
  their sum.
- Master-to-title correlation: `Request encode on master` received a productionId and
  episode number and issued a titleId with nothing to map between them. Changed: Title has
  `productionId` (absent for licensed titles), Episode has `masterEpisodeNumber`, and the
  policy says how it matches.
- `BudgetApprovedBeforeShoot` constrained a shoot the model did not hold. Changed:
  Production has a `phase` attribute and the invariant constrains it with the budget.
- `AdsOnlyOnAdSupportedPlan` constrained a plan AdBreak did not carry. Changed: AdBreak
  records `householdId`, `planTier` and `country`; Ads asks Billing's `GetEntitlement` for
  the plan (a new consumption and relationship), which is what "we work with plan and
  country" needs.
- Catalogue episodes had no rating although the interview names the rating as what makes
  them different from the studio's. Changed: Episode has a rating (`0..1`) and the
  invariant text says an episode may be rated above its series.
- Inert consumptions: `TitleAvailabilityChanged` was consumed by nobody, Recommendations
  consumed `TitlePublished` with no policy, Billing consumed `HouseholdCreated` with no
  policy. Changed: the Ranker consumes both catalogue events with an "Add candidate on
  publish" policy issuing `AddCandidate`; Billing has "Await plan on household" issuing
  `RegisterHousehold`. The event storming table now names both.
- Two Encoding→Catalogue relationships in the same direction: section 6 said "upstream of
  each other", which the code never was. Changed: one customer-supplier relationship
  carrying both upstream roles; section 6 corrected.
- Glossary gaps: Studio had no `Episode`, Identity no `Account`, Playback no `Device`
  although each side of those collisions was named in section 4. Changed: all three terms
  added, each pointing at its counterpart; the session distinguishes `deviceId` (a unit)
  from `deviceModelId` (what certification is about).
- A film needed a dummy season and episode to be playable. Changed: Title has its own
  `playableRenditionSet` for films and `PublishedTitleHasPlayableAsset` covers both cases.
- `KidsProfileMaturityCapped` did not name the profile whose kids flag makes it apply.
  Changed: it constrains Profile as well as the two value objects.
- `Slate` was defined as everything commissioned or licensed but embodied only by
  Production. Changed: the definition now says it is the studio's half of the slate.

Partially accepted

- `WithinStreamLimit` on a single session: a session cannot count its siblings. The rule is
  real and is kept at start, using the stream count `GetEntitlement` returns. Changed:
  PlaybackSession has `householdId`, and since decision 27 the rule is Playback's own
  invariant rather than the session aggregate's, constraining `householdId` and naming
  `StartPlayback` as its guard. No new "lease" aggregate: that is a design choice for the
  Playback team.
- `OneActiveSubscriptionPerHousehold` on a single subscription: same shape. Changed: it is
  the Billing & Plans context's invariant, constraining `householdId` and naming
  `StartSubscription` as its guard. No BillingAccount root was invented; the Commerce lead
  described none.
- Playback and Ads are mutually downstream, and the Playback summary said breaks were asked
  for before the start. The two interviews disagreed and the record hid it. The Ads lead's
  sequence (start event, then resolve each break when reached) is what both teams confirmed,
  so the Playback summary is corrected and the two directed relationships are kept with a
  comment saying why.
- Daily frequency cap cannot be enforced by one break. Accepted that the break only carries
  the rule; the value object and `PrepareBreaks` now say the check runs against the
  household's impressions that day. No ad decisioning service was added; the Ads lead
  described none.

Rejected

- Cross-context `references` from PlaybackSession and Signal to Title: `references` is the
  DSL's way of holding another root's identity and is exactly what the cross-aggregate rule
  permits; both entities also carry a scalar `titleId`.
- Billing should not conform to Households, and cannot be customer-supplier with Playback,
  because it is generic: generic classifies the subdomain (buy rather than build), not the
  integration stance; the Commerce team is internal, said Playback is consulted, and
  consumes a three-field event with nothing to translate.
- Physical Rental does not belong in the Viewing domain: the disc business is the other way
  members watch the slate; a domain of its own for a two-person legacy line would fragment
  the problem space.
- Title is a "god aggregate" and availability should be split out for write contention:
  the Catalogue lead put availability with the title because the licence rule is checked
  there, and the brief says scale is not a modelling problem for this engagement.
- The interviews are ventriloquised and frictionless: section 2 says they are composites in
  the voice of the role, and the frictions are in the record (the bookmark dispute, the ads
  refusal, the 2019 revert, the half-written rule, and now the Playback/Ads disagreement).
- DRM licensing is an unexamined hole: section 8 leaves it out deliberately, with an owner
  for the next session.
- "We would happily buy all of this" is unrealistic at 41 countries: it is the Commerce
  lead's stance on differentiation, which is what the classification asks, not a claim that
  the work is small.
