# StreamLine: client brief

Onboarding pack for the domain modelling engagement, assembled from the kick-off with the
Chief Product Officer's office and the VP of Engineering before interviews began. The
discovery record (`DISCOVERY.md`) says what the teams told us afterwards. StreamLine is
fictional.

## Who they are

StreamLine began in 2008 in Bristol as StreamLine Discs, a DVD-by-post rental service with
a queue you managed on a website. It launched streaming in 2012 to its existing members,
commissioned its first original series in 2016, and added an advertising-supported plan in
2023. The disc business still exists, still makes a small profit, and still runs on the
code written in 2009.

- 82 million paying households in 41 countries; about 190 million profiles.
- 6,400 employees, 2,100 of them in engineering, product and data.
- Revenue last year of 9.8 billion, of which 6% came from the ads plan in its first full
  year and 0.3% from discs.
- A content budget of 4.1 billion, split roughly evenly between licensed titles and
  originals produced by StreamLine's own studio arm.

## What they do

A member pays a monthly plan for a household, sets up profiles for the people in it, and
watches films and series on any certified device. Behind the play button:

- **The studio arm** commissions and produces originals, from greenlight to delivery of the
  finished master files.
- **Content acquisition** licenses third-party titles by territory and by time window.
- **The catalogue** turns masters and licences into titles members can see, in the right
  countries, on the right dates, with artwork and ratings.
- **The encoding pipeline** makes the dozens of renditions each title needs for every
  device and network condition.
- **Playback and edge delivery** serve those renditions from caches installed inside
  internet providers' networks around the world.
- **Personalisation** decides what each profile sees on its home screen.
- **Members, billing and devices** hold households, plans, invoices and the partner devices
  the app runs on.
- **The ads tier** fills ad breaks for members on the cheaper plan.

## What makes them different

Management named three things, and the engineering leadership agreed with the order:

1. **The slate.** What is on StreamLine that is not anywhere else. Originals and exclusive
   licences are the reason people subscribe and the reason they do not leave.
2. **Personalisation.** Every home screen is different. The company's own analysis is that
   a large majority of viewing starts from a recommended row, and that the quality of that
   ranking is the single strongest lever on retention.
3. **Playback quality at scale.** The per-title encoding ladder and the edge caches inside
   ISPs mean a stream starts in under a second and rarely stalls, on a phone in a lift or a
   television on fibre. Members do not notice it; they notice its absence at competitors.

Nobody at StreamLine thinks billing, identity, device registration or the catalogue
database are what sets them apart. They think those must be excellent and boring.

## Where the challenges are

**The disc business.** StreamLine Discs runs on a 2009 monolith with its own database, its
own account records and a billing job that posts a monthly charge into the main billing
system through an export nobody has touched since 2017. Two people in Legacy Operations
keep it alive. Executives have decided, twice, not to shut it down.

**Ads and personalisation.** When the ads plan launched, the Ads team asked to use viewing
signals for targeting and to have sponsored rows on the home screen. The CPO refused both:
advertising must never be a ranking signal and the recommendation engine must never see
advertising data. This is written into the ads plan's public commitments and is enforced by
keeping the two systems apart entirely.

**Playback and devices.** The app runs on thousands of device models from dozens of
partners. The player and the device SDK are versioned together and certified together;
a device that has not been certified against the current SDK is not allowed to play. The
Playback and Partner Devices teams plan every release jointly and have done for years.

**Playback and edge.** The manifest and segment formats the player asks for and the edge
appliances serve are one specification with one implementation library, changed by both
teams. Separating them was tried in 2019 and reverted after a bad weekend.

**Encoding and the catalogue.** The studio's delivery specification for master files is
also what the encoding pipeline consumes, so Media Engineering does not translate it. The
catalogue, which sits between the two, has to react to masters arriving, licences opening
and closing, and encodes completing, and the sequencing is the source of most "why isn't it
live yet" escalations.

**Recommendations reaching into playback.** The Personalisation team recently started
reading the player's resume-point updates directly to improve "continue watching" rows.
The Playback team regards those updates as internal to the player and did not agree the
dependency.

**Scale.** Peak concurrency above 20 million streams; the catalogue changes availability in
some territory every few seconds; the encoding pipeline processes a few thousand hours of
source a day. Not a modelling problem, but every team is protective of what it publishes.

## The teams

| Team | Organisation | Looks after |
|---|---|---|
| Studio Technology Team | Studio | Production tracking and master delivery |
| Content Acquisition Team | Content | Licence deals, windows, territories |
| Catalogue Team | Content | Titles, seasons, episodes, artwork, availability |
| Media Engineering Team | Streaming Platform | The encoding pipeline and the ladder |
| Playback Team | Streaming Platform | The player, sessions, manifests |
| Edge Delivery Team | Streaming Platform | Appliances in ISPs, cache placement |
| Partner Devices Team | Streaming Platform | Device registration and certification |
| Personalisation Team | Data & Personalisation | Recommendations and ranking |
| Member Experience Team | Members | Households, profiles, parental controls |
| Commerce Team | Members | Plans, subscriptions, invoices, entitlement |
| Identity Team | Members | Accounts and sign-in |
| Ads Team | Advertising | Ad breaks, slots, impressions |
| Legacy Operations Team | Operations | StreamLine Discs |

Streaming Platform is the largest organisation and the one with the most internal
agreements (the shared format library, the joint device releases). Content and Members are
separate organisations reporting to different executives. Advertising is new and reports to
the CFO.

## What they asked for

A context-level model of the whole service that makes the deliberate separations visible
(ads from personalisation), the deliberate couplings visible (player and edge, player and
devices), and the sequencing from master to playable title explicit, with enough detail
inside the member-facing contexts to settle the household and plan rules. Known problems
were to stay in the model so the validation output could be shown to the teams concerned.
