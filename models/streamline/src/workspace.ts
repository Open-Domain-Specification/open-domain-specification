import { Workspace } from "@open-domain-specification/core";
import { money } from "@open-domain-specification/model-tools";

/**
 * StreamLine: a fictional streaming service in the shape of a large one.
 *
 * The business: StreamLine makes and licenses a slate nobody else has, ranks
 * it differently for every profile, and plays it from caches inside internet
 * providers' networks. Hence the classification: studio production,
 * licensing, encoding, playback, edge delivery and recommendations are core;
 * the catalogue, households, devices, the ads tier and the disc business are
 * supporting; billing and identity are generic.
 *
 * Stress-test features: thirteen contexts, a master-to-playable sequence that
 * crosses four of them, a shared kernel (player and edge), a partnership
 * (player and devices), a separate-ways pair (ads and recommendations), a
 * legacy big ball of mud (the disc business), and three deliberate mistakes
 * (marked DELIBERATE) that trigger policy-complete, schema-context and
 * internal-consumable.
 *
 * Provenance: BRIEF.md and DISCOVERY.md. Comments "DISCOVERY: <who>" point at
 * the interview an element came from.
 */
export const workspace = new Workspace("StreamLine", {
	id: "streamline",
	odsVersion: "1.0.0",
	description:
		"A fictional streaming service: studio production, licensing, catalogue, encoding, playback and edge delivery, recommendations, households and profiles, billing and plans, devices, an ads tier and a legacy disc business.",
	version: "1.0.0",
	primaryColor: "#e11d48",
});

/* =======================
   DOMAINS & SUBDOMAINS
   DISCOVERY section 5 has the reasoning for each classification.
   ======================= */

const content = workspace.addDomain("Content", {
	description: "Making, licensing and preparing the slate",
});
const studioSD = content.addSubdomain("Studio Production", {
	type: "core",
	description:
		"Originals from greenlight to delivered master. Core: the exclusive part of the slate",
});
const licensingSD = content.addSubdomain("Licensing", {
	type: "core",
	description:
		"Third-party titles by territory and window. Core: exclusive windows are fought over",
});
const catalogueSD = content.addSubdomain("Catalogue", {
	type: "supporting",
	description:
		"Titles, seasons, episodes, availability. Supporting: must be excellent and boring",
});
const encodingSD = content.addSubdomain("Encoding", {
	type: "core",
	description:
		"Per-title ladders and renditions. Core: a real quality and cost advantage",
});

const viewing = workspace.addDomain("Viewing", {
	description: "Playing the slate on anything, anywhere",
});
const playbackSD = viewing.addSubdomain("Playback", {
	type: "core",
	description:
		'Sessions, manifests, bitrate selection. Core: "we play them perfectly"',
});
const edgeSD = viewing.addSubdomain("Edge Delivery", {
	type: "core",
	description:
		"Caches inside ISPs. Core: why a stream starts in under a second",
});
const devicesSD = viewing.addSubdomain("Devices", {
	type: "supporting",
	description: "Partner device registration and certification",
});
const physicalSD = viewing.addSubdomain("Physical Rental", {
	type: "supporting",
	description:
		"The disc-by-post business, kept alive by decision rather than investment",
});

const personalisation = workspace.addDomain("Personalisation", {
	description: "A different home screen for every profile",
});
const recsSD = personalisation.addSubdomain("Recommendations", {
	type: "core",
	description:
		"Ranking rows per profile. Core: the strongest lever on retention",
});

const members = workspace.addDomain("Members", {
	description: "Households, plans, sign-in",
});
const householdsSD = members.addSubdomain("Households & Profiles", {
	type: "supporting",
	description: "The paying unit and the people in it",
});
const billingSD = members.addSubdomain("Billing & Plans", {
	type: "generic",
	description:
		'Plans, subscriptions, invoices, entitlement. Generic: "we would happily buy all of this"',
});
const identitySD = members.addSubdomain("Identity", {
	type: "generic",
	description: "Accounts and sign-in",
});

const advertising = workspace.addDomain("Advertising", {
	description: "Filling ad breaks on the cheaper plan",
});
const adsSD = advertising.addSubdomain("Ads Tier", {
	type: "supporting",
	description: "Breaks, slots, impressions. Supporting today; may become core",
});

/* =======================
   TEAMS
   ======================= */

const studioTeam = workspace.addTeam("Studio Technology Team", {
	description: "Production tracking and master delivery",
});
const acquisitionTeam = workspace.addTeam("Content Acquisition Team", {
	description: "Licence deals, windows, territories",
});
const catalogueTeam = workspace.addTeam("Catalogue Team", {
	description: "Titles, availability, artwork",
});
const mediaTeam = workspace.addTeam("Media Engineering Team", {
	description: "The encoding pipeline",
});
const playbackTeam = workspace.addTeam("Playback Team", {
	description:
		"The player and sessions; co-owns the format library with Edge Delivery",
});
const edgeTeam = workspace.addTeam("Edge Delivery Team", {
	description: "Appliances in ISPs",
});
const devicesTeam = workspace.addTeam("Partner Devices Team", {
	description: "Device registration and certification; releases with Playback",
});
const personalisationTeam = workspace.addTeam("Personalisation Team", {
	description: "Recommendations and ranking",
});
const memberTeam = workspace.addTeam("Member Experience Team", {
	description: "Households, profiles, parental controls",
});
const commerceTeam = workspace.addTeam("Commerce Team", {
	description: "Plans, subscriptions, invoices",
});
const identityTeam = workspace.addTeam("Identity Team", {
	description: "Accounts and sign-in",
});
const adsTeam = workspace.addTeam("Ads Team", {
	description: "Ad breaks and impressions",
});
const legacyTeam = workspace.addTeam("Legacy Operations Team", {
	description: "Keeps StreamLine Discs running",
});

/* =======================
   BOUNDED CONTEXTS
   ======================= */

const studioBC = studioSD.addBoundedcontext("Studio Production", {
	description: "Productions, episodes and delivered masters",
	team: studioTeam,
});
const licensingBC = licensingSD.addBoundedcontext("Licensing", {
	description: "Deals with licensors and the windows inside them",
	team: acquisitionTeam,
});
const catalogueBC = catalogueSD.addBoundedcontext("Catalogue", {
	description: "What members can see, where and when",
	team: catalogueTeam,
});
const encodingBC = encodingSD.addBoundedcontext("Encoding", {
	description: "Jobs that turn a master into a ladder of renditions",
	team: mediaTeam,
});
const playbackBC = playbackSD.addBoundedcontext("Playback", {
	description: "Sessions, manifests and bitrate selection",
	team: playbackTeam,
});
const edgeBC = edgeSD.addBoundedcontext("Edge Delivery", {
	description: "Appliances in ISPs and what they cache",
	team: edgeTeam,
});
const devicesBC = devicesSD.addBoundedcontext("Devices", {
	description: "Partner device models and their certification",
	team: devicesTeam,
});
const recsBC = recsSD.addBoundedcontext("Recommendations", {
	description: "Taste profiles and the ranker behind the home screen",
	team: personalisationTeam,
});
const householdsBC = householdsSD.addBoundedcontext("Households & Profiles", {
	description: "The paying unit and up to five profiles",
	team: memberTeam,
});
const billingBC = billingSD.addBoundedcontext("Billing & Plans", {
	description: "Subscriptions, invoices and entitlement",
	team: commerceTeam,
});
const identityBC = identitySD.addBoundedcontext("Identity", {
	description: "Accounts and sign-in",
	team: identityTeam,
});
const adsBC = adsSD.addBoundedcontext("Ads Tier", {
	description: "Breaks, slots and impressions for the ad-supported plan",
	team: adsTeam,
});
// DISCOVERY: Legacy Operations. "Please don't ask about the rest."
const discsBC = physicalSD.addBoundedcontext("Disc Rental (legacy)", {
	description:
		"StreamLine Discs: a 2009 monolith with its own accounts and a monthly charge export. Modelled at its edge only",
	bigBallOfMud: true,
	team: legacyTeam,
});

/* =======================
   STUDIO PRODUCTION
   DISCOVERY: Head of Studio Technology. No shoot before the budget is
   approved; episode numbers are unique because the delivery spec keys on them.
   ======================= */

const productionAgg = studioBC.addAggregate("Production", {
	description: "One original from greenlight to delivered masters",
});
const production = productionAgg.addRootEntity("Production", {
	description: "A commissioned film or series",
});
const studioEpisode = productionAgg.addEntity("Episode", {
	description:
		"A production artefact: a number, a runtime and eventually a master. Not the catalogue's episode",
});
const budgetVO = productionAgg.addValueObject("Budget", {
	description:
		"Approved spend; a value because two productions with the same figures have the same budget",
});
const budgetMoney = money(productionAgg);
budgetVO.addAttribute("approved", { type: "Money", valueobject: budgetMoney });
budgetVO.addAttribute("approvedOn", { type: "date" });
production.addAttribute("productionId", { type: "string", identity: true });
production.addAttribute("workingTitle", { type: "string" });
production.addAttribute("greenlitOn", { type: "date" });
// DISCOVERY: Head of Studio Technology, peer review. The phase is what
// "before the shoot" is measured against; without it the invariant named
// something the model did not hold.
const productionPhase = production.addAttribute("phase", {
	type: "'development' | 'shooting' | 'post' | 'delivered'",
	description:
		"Where the production is; shooting cannot begin in development without an approved budget",
});
const episodeNumber = studioEpisode.addAttribute("episodeNumber", {
	type: "int",
	identity: true,
});
studioEpisode.addAttribute("runtimeMinutes", { type: "int" });
studioEpisode.addAttribute("masterUri", { type: "string (URI)" });
production.includes(studioEpisode, "made-of", "1..*");
production.uses(budgetVO, "funded-by", "1");
budgetVO.uses(budgetMoney, "amount", "1");

productionAgg
	.addInvariant("BudgetApprovedBeforeShoot", {
		description:
			"The phase cannot move to shooting until the budget carries an approval date",
	})
	.constrains(budgetVO, productionPhase);
productionAgg
	.addInvariant("EpisodeNumbersUnique", {
		description:
			"Episode numbers within a production are unique; the delivery spec keys on them",
	})
	.constrains(episodeNumber);

const masterDeliveredSchema = studioBC.addSchema("MasterDelivered", {
	description:
		"The delivery spec: what the catalogue and the encoder learn about a master",
});
masterDeliveredSchema.addAttribute("productionId", {
	type: "string",
	identity: true,
});
masterDeliveredSchema.addAttribute("episodeNumber", { type: "int" });
masterDeliveredSchema.addAttribute("mezzanineUri", { type: "string (URI)" });
masterDeliveredSchema.addAttribute("runtimeMinutes", { type: "int" });

const productionGreenlit = productionAgg.provides("ProductionGreenlit", {
	description: "The slate gained a title; scheduling is out of scope here",
	type: "event",
	internal: true,
});
const masterDelivered = productionAgg.provides("MasterDelivered", {
	description: "A finished master is in the delivery bucket",
	type: "event",
	pattern: "published-language",
	schema: masterDeliveredSchema,
});
productionAgg
	.provides("Greenlight", {
		description: "Commission the production",
		type: "operation",
		internal: true,
	})
	.raises(productionGreenlit);

const studioPortal = studioBC.addService("StudioPortal", {
	description:
		"The documented delivery portal; external post houses use it too",
	type: "application",
});
studioPortal
	.provides("SubmitDelivery", {
		description: "Upload a master against a production and episode",
		type: "operation",
		pattern: "open-host-service",
		schema: masterDeliveredSchema,
	})
	.raises(masterDelivered);

studioBC.addTerm("Master", {
	definition: "The finished file for one film or episode, to the delivery spec",
	aliases: ["Mezzanine"],
	embodiedBy: masterDelivered,
});
studioBC.addTerm("Slate", {
	definition:
		"In the studio, the originals commissioned for a period. The company-wide slate also includes Licensing's windows; this term covers only the studio's half",
	embodiedBy: productionAgg,
});
// The same word as the catalogue's Episode, meaning a different thing; both
// contexts define it so the collision is visible from either side.
studioBC.addTerm("Episode", {
	definition:
		"A production artefact keyed by number within the production: a runtime and a master. The catalogue's episode is what a member plays",
	embodiedBy: studioEpisode,
});

/* =======================
   LICENSING
   DISCOVERY: Head of Content Acquisition. Windows within the term; no
   overlapping windows per territory "or we've paid twice".
   ======================= */

const dealAgg = licensingBC.addAggregate("LicenseDeal", {
	description:
		"A deal with a licensor and the windows inside it; windows are checked against each other, so they live together",
});
const deal = dealAgg.addRootEntity("LicenseDeal", {
	description: "One contract with one licensor for a term",
});
const window = dealAgg.addEntity("Window", {
	description:
		"A territory, a start, an end and whether StreamLine is exclusive",
});
const territoryVO = dealAgg.addValueObject("Territory", {
	description: "A set of countries a window covers. Not a cache region",
});
territoryVO.addAttribute("countries", { type: "ISO 3166 code[]" });
const feeMoney = money(dealAgg);
deal.addAttribute("dealId", { type: "string", identity: true });
deal.addAttribute("licensor", { type: "string" });
deal.addAttribute("termStart", { type: "date" });
deal.addAttribute("termEnd", { type: "date" });
deal.addAttribute("fee", { type: "Money", valueobject: feeMoney });
window.addAttribute("windowId", { type: "string", identity: true });
window.addAttribute("titleId", { type: "string" });
window.addAttribute("start", { type: "date" });
window.addAttribute("end", { type: "date" });
window.addAttribute("exclusive", { type: "boolean" });
deal.includes(window, "grants", "1..*");
window.uses(territoryVO, "covers", "1");
deal.uses(feeMoney, "costs", "1");

dealAgg
	.addInvariant("WindowWithinTerm", {
		description: "A window never extends past the deal term",
	})
	.constrains(window);
dealAgg
	.addInvariant("NoOverlappingWindowsPerTerritory", {
		description: "Two windows for the same title and territory never overlap",
	})
	.constrains(window, territoryVO);

const windowSchema = licensingBC.addSchema("LicenseWindow", {
	description: "Title, territories and dates; used by both window events",
});
windowSchema.addAttribute("titleId", { type: "string", identity: true });
windowSchema.addAttribute("territory", {
	type: "Territory",
	valueobject: territoryVO,
});
windowSchema.addAttribute("start", { type: "date" });
windowSchema.addAttribute("end", { type: "date" });

const windowOpened = dealAgg.provides("LicenseWindowOpened", {
	description: "A title may be shown in these countries from today",
	type: "event",
	pattern: "published-language",
	schema: windowSchema,
});
const windowExpired = dealAgg.provides("LicenseWindowExpired", {
	description: "The title must come down in these countries today",
	type: "event",
	pattern: "published-language",
	schema: windowSchema,
});
dealAgg
	.provides("OpenWindow", {
		description: "Start a window on its start date",
		type: "operation",
		internal: true,
	})
	.raises(windowOpened);
dealAgg
	.provides("ExpireWindow", {
		description: "End a window on its end date",
		type: "operation",
		internal: true,
	})
	.raises(windowExpired);

licensingBC.addTerm("Window", {
	definition: "The period and territory in which a licensed title may be shown",
	embodiedBy: window,
});
licensingBC.addTerm("Territory", {
	definition:
		"The countries a window covers. Edge Delivery's 'region' is something else",
	embodiedBy: territoryVO,
});

/* =======================
   CATALOGUE
   DISCOVERY: Catalogue Team lead. Reacts to masters, encodes and windows;
   "nobody else's model gets into our tables".
   ======================= */

const titleAgg = catalogueBC.addAggregate("Title", {
	description:
		"A film or series as members see it, with seasons, episodes, artwork, rating and availability",
});
const title = titleAgg.addRootEntity("Title", {
	description: "One film or series",
});
const season = titleAgg.addEntity("Season", {
	description: "A numbered group of episodes",
});
const catalogueEpisode = titleAgg.addEntity("Episode", {
	description:
		"What a member plays; carries artwork and a rating, unlike the studio's episode",
});
const artworkVO = titleAgg.addValueObject("Artwork", {
	description: "Images by aspect ratio",
});
artworkVO.addAttribute("images", { type: "{ratio, uri}[]" });
const ratingVO = titleAgg.addValueObject("MaturityRating", {
	description: "The rating shown and enforced by profile maturity settings",
});
ratingVO.addAttribute("scheme", { type: "string" });
ratingVO.addAttribute("value", { type: "string" });
const availabilityVO = titleAgg.addValueObject("Availability", {
	description:
		"Countries and dates a title is live, derived from licence windows or studio ownership",
});
availabilityVO.addAttribute("countries", { type: "ISO 3166 code[]" });
availabilityVO.addAttribute("from", { type: "date" });
availabilityVO.addAttribute("until", { type: "date" });
title.addAttribute("titleId", { type: "string", identity: true });
title.addAttribute("name", { type: "string" });
title.addAttribute("kind", { type: "'film' | 'series'" });
title.addAttribute("rating", { type: "MaturityRating", valueobject: ratingVO });
// DISCOVERY: Catalogue Team lead, peer review. The correlation keys: a
// delivered master names a production and an episode number, and the
// catalogue must find its own title and episode from them. Licensed titles
// have no production; their masters arrive through the licensor.
title.addAttribute("productionId", {
	type: "string",
	description:
		"The studio production behind an original, or absent for a licensed title; how MasterDelivered is matched to a title",
});
title.addAttribute("playableRenditionSet", {
	type: "string",
	description:
		"For a film, the encoding job whose renditions it plays; a series plays through its episodes",
});
season.addAttribute("seasonNumber", { type: "int", identity: true });
catalogueEpisode.addAttribute("episodeId", { type: "string", identity: true });
catalogueEpisode.addAttribute("masterEpisodeNumber", {
	type: "int",
	description:
		"The studio's episode number for this episode; how a master is matched to it",
});
catalogueEpisode.addAttribute("playableRenditionSet", {
	type: "string",
	description: "The encoding job whose renditions this episode plays",
});
catalogueEpisode.addAttribute("rating", {
	type: "MaturityRating",
	valueobject: ratingVO,
	description: "An episode may be rated above its series",
});
title.includes(season, "has-seasons", "*");
season.includes(catalogueEpisode, "has-episodes", "1..*");
title.uses(artworkVO, "shown-with", "1");
title.uses(ratingVO, "rated", "1");
title.uses(availabilityVO, "available", "*");
catalogueEpisode.uses(artworkVO, "shown-with", "0..1");
catalogueEpisode.uses(ratingVO, "rated", "0..1");

titleAgg
	.addInvariant("PublishedTitleHasPlayableAsset", {
		description:
			"A title is published only when it (a film) or at least one of its episodes (a series) has a completed encode",
	})
	.constrains(title, catalogueEpisode);
titleAgg
	.addInvariant("RatingRequiredBeforePublish", {
		description: "No rating, no publish; profiles enforce maturity on it",
	})
	.constrains(ratingVO);
titleAgg
	.addInvariant("AvailabilityMatchesLicence", {
		description:
			"Availability in a country never exceeds a licence window or studio ownership",
	})
	.constrains(availabilityVO);

const titleRefSchema = catalogueBC.addSchema("TitleRef", {
	description: "Identifies one title, optionally one episode",
});
titleRefSchema.addAttribute("titleId", { type: "string", identity: true });
titleRefSchema.addAttribute("episodeId", { type: "string" });
const availabilityChangedSchema = catalogueBC.addSchema(
	"TitleAvailabilityChanged",
);
availabilityChangedSchema.addAttribute("titleId", {
	type: "string",
	identity: true,
});
availabilityChangedSchema.addAttribute("availability", {
	type: "Availability",
	valueobject: availabilityVO,
});

const titlePublished = titleAgg.provides("TitlePublished", {
	description: "Members can now see the title somewhere",
	type: "event",
	pattern: "published-language",
	schema: titleRefSchema,
});
const availabilityChanged = titleAgg.provides("TitleAvailabilityChanged", {
	description: "Where and when a title is live changed",
	type: "event",
	pattern: "published-language",
	schema: availabilityChangedSchema,
});
const titleUnpublished = titleAgg.provides("TitleUnpublished", {
	description: "The title came down everywhere",
	type: "event",
	internal: true,
});
const publishTitle = titleAgg
	.provides("PublishTitle", {
		description: "Make a title visible once it has an encode and a rating",
		type: "operation",
		internal: true,
	})
	.raises(titlePublished);
const updateAvailability = titleAgg
	.provides("UpdateAvailability", {
		description: "Recompute availability from windows",
		type: "operation",
		internal: true,
	})
	.raises(availabilityChanged);
const unpublishTitle = titleAgg
	.provides("UnpublishTitle", {
		description: "Take a title down the day its last window expires",
		type: "operation",
		internal: true,
	})
	.raises(titleUnpublished);

const catalogueApi = catalogueBC.addService("CatalogueAPI", {
	description: "The documented read API for titles",
	type: "application",
});
const getTitle = catalogueApi.provides("GetTitle", {
	description: "Read a title with seasons, episodes and availability",
	type: "operation",
	pattern: "open-host-service",
	schema: titleRefSchema,
});

catalogueBC.addTerm("Title", {
	definition: "A film or series as a member sees it",
	embodiedBy: titleAgg,
});
catalogueBC.addTerm("Episode", {
	definition:
		"What a member plays, with artwork and a rating. The studio's episode is the production artefact behind it",
	embodiedBy: catalogueEpisode,
});
catalogueBC.addTerm("Availability", {
	definition: "The countries and dates a title is live",
	embodiedBy: availabilityVO,
});

/* =======================
   ENCODING
   DISCOVERY: Media Engineering lead. Per-title ladders; every ladder has a
   rung under 300 kbit/s; the studio's delivery spec is consumed as it is.
   ======================= */

const jobAgg = encodingBC.addAggregate("EncodingJob", {
	description: "One source in, a ladder of renditions out",
});
const job = jobAgg.addRootEntity("EncodingJob", {
	description: "The unit of work for one master",
});
const rendition = jobAgg.addEntity("Rendition", {
	description:
		"One codec, bitrate and resolution; an entity because each is addressed by the player",
});
const ladderVO = jobAgg.addValueObject("Ladder", {
	description:
		"The planned rungs: bitrate and resolution pairs chosen for this title's content",
});
ladderVO.addAttribute("rungs", { type: "{bitrateKbps, height}[]" });
job.addAttribute("jobId", { type: "string", identity: true });
job.addAttribute("titleId", { type: "string" });
job.addAttribute("sourceUri", { type: "string (URI)" });
job.addAttribute("status", {
	type: "'queued' | 'running' | 'completed' | 'failed'",
});
rendition.addAttribute("renditionId", { type: "string", identity: true });
rendition.addAttribute("codec", { type: "string" });
rendition.addAttribute("bitrateKbps", { type: "int" });
rendition.addAttribute("height", { type: "int" });
job.includes(rendition, "produces", "*");
job.uses(ladderVO, "planned-as", "1");

jobAgg
	.addInvariant("LadderHasLowestRung", {
		description:
			"Every ladder has a rung under 300 kbit/s so a stream starts on a bad network",
	})
	.constrains(ladderVO);
jobAgg
	.addInvariant("RenditionsMatchLadder", {
		description: "A completed job has exactly one rendition per planned rung",
	})
	.constrains(rendition, ladderVO);

const submitEncodeSchema = encodingBC.addSchema("SubmitEncode");
submitEncodeSchema.addAttribute("titleId", { type: "string" });
submitEncodeSchema.addAttribute("sourceUri", { type: "string (URI)" });
const encodingCompletedSchema = encodingBC.addSchema("EncodingCompleted", {
	description: "The rendition list the catalogue and the edge react to",
});
encodingCompletedSchema.addAttribute("jobId", {
	type: "string",
	identity: true,
});
encodingCompletedSchema.addAttribute("titleId", { type: "string" });
encodingCompletedSchema.addAttribute("renditionIds", { type: "string[]" });

const encodeQueued = jobAgg.provides("EncodeQueued", {
	description: "A job is waiting for a ladder plan",
	type: "event",
	internal: true,
});
const encodingCompleted = jobAgg.provides("EncodingCompleted", {
	description: "All renditions are available",
	type: "event",
	pattern: "published-language",
	schema: encodingCompletedSchema,
});
const submitEncode = jobAgg
	.provides("SubmitEncode", {
		description: "Queue a master for encoding",
		type: "operation",
		pattern: "open-host-service",
		schema: submitEncodeSchema,
	})
	.raises(encodeQueued);
jobAgg
	.provides("CompleteJob", {
		description: "Record the finished renditions",
		type: "operation",
		internal: true,
	})
	.raises(encodingCompleted);

const ladderPlanner = encodingBC.addService("PerTitleLadderPlanner", {
	description:
		"Analyses the source and chooses rungs; a domain service because it compares against every previous title",
	type: "domain",
});
const planLadder = ladderPlanner.provides("PlanLadder", {
	description: "Choose the ladder for a queued job",
	type: "operation",
	internal: true,
});

// The delivery spec is the industry format, so Encoding conforms to it.
jobAgg.consumes(masterDelivered, { pattern: "conformist" });
encodingBC
	.addPolicy("Plan ladder on queue", {
		description: "Every queued job gets a per-title ladder before it runs",
	})
	.on(encodeQueued)
	.then(planLadder);

encodingBC.addTerm("Ladder", {
	definition: "The set of bitrate and resolution rungs a title is encoded at",
	embodiedBy: ladderVO,
});
encodingBC.addTerm("Rendition", {
	definition:
		"One encoded version of a title. Older documents say profile, which collides with member profiles",
	aliases: ["Profile"],
	embodiedBy: rendition,
});

// The catalogue sits between studio, licensing and encoding: four reactions.
titleAgg.consumes(masterDelivered, { pattern: "anti-corruption-layer" });
titleAgg.consumes(encodingCompleted, { pattern: "anti-corruption-layer" });
titleAgg.consumes(windowOpened, { pattern: "anti-corruption-layer" });
titleAgg.consumes(windowExpired, { pattern: "anti-corruption-layer" });
titleAgg.consumes(submitEncode, { pattern: "anti-corruption-layer" });
catalogueBC
	.addPolicy("Request encode on master", {
		description:
			"A delivered master is matched to the title by productionId (and the episode by masterEpisodeNumber) and queued for encoding under that titleId",
	})
	.on(masterDelivered)
	.then(submitEncode);
catalogueBC
	.addPolicy("Publish on encode", {
		description: "A completed encode makes the title publishable",
	})
	.on(encodingCompleted)
	.then(publishTitle);
catalogueBC
	.addPolicy("Update availability on window", {
		description: "An opened window changes where the title is live",
	})
	.on(windowOpened)
	.then(updateAvailability);
catalogueBC
	.addPolicy("Unpublish on expiry", {
		description: "An expired window takes the title down that day",
	})
	.on(windowExpired)
	.then(unpublishTitle);

/* =======================
   PLAYBACK
   DISCOVERY: Playback engineering lead. Entitlement before start; the
   bookmark is internal; stopped is a business fact.
   ======================= */

const sessionAgg = playbackBC.addAggregate("PlaybackSession", {
	description: "One profile watching one title on one device",
});
const session = sessionAgg.addRootEntity("PlaybackSession", {
	description: "The unit playback rules are stated about",
});
const bookmarkVO = sessionAgg.addValueObject("Bookmark", {
	description:
		"The resume point; updated every few seconds, kept inside the player",
});
bookmarkVO.addAttribute("positionSeconds", { type: "int" });
const manifestVO = sessionAgg.addValueObject("StreamManifest", {
	description:
		"The renditions and the edge to fetch from, in the format shared with Edge Delivery",
});
manifestVO.addAttribute("renditionIds", { type: "string[]" });
manifestVO.addAttribute("edgeUrl", { type: "string (URL)" });
session.addAttribute("sessionId", { type: "string", identity: true });
session.addAttribute("profileId", { type: "string" });
// DISCOVERY: peer review. The household is what entitlement and the stream
// limit are about, and a series is watched an episode at a time, so both
// identities belong on the session.
const sessionHousehold = session.addAttribute("householdId", {
	type: "string",
	description:
		"The paying unit the profile belongs to; what entitlement is checked for",
});
session.addAttribute("titleId", { type: "string" });
session.addAttribute("episodeId", {
	type: "string",
	description:
		"Absent for a film; for a series, the episode being played and bookmarked",
});
const sessionDevice = session.addAttribute("deviceId", {
	type: "string",
	description: "The individual unit (an installation), not the partner model",
});
session.addAttribute("deviceModelId", {
	type: "string",
	description:
		"The partner model the unit is an instance of; what certification is checked against",
});
session.addAttribute("bookmark", { type: "Bookmark", valueobject: bookmarkVO });
session.uses(bookmarkVO, "resumes-at", "1");
session.uses(manifestVO, "streams-from", "1");
// The Title root is in Catalogue, another bounded context: a relation never
// crosses one, so the session holds `titleId` and nothing more.

sessionAgg
	.addInvariant("SessionNeedsEntitlement", {
		description:
			"A session starts only with a current entitlement from billing",
	})
	.constrains(session);
// One session cannot see its siblings, so the limit is checked at start:
// GetEntitlement returns the plan's stream count and Playback counts the
// household's open sessions before it creates another.
sessionAgg
	.addInvariant("WithinStreamLimit", {
		description:
			"A session starts only if the household's open sessions are fewer than the plan's stream count from GetEntitlement; checked at StartPlayback because a session cannot see its siblings",
	})
	.constrains(sessionHousehold);
sessionAgg
	.addInvariant("BookmarkWithinRuntime", {
		description: "The resume point never exceeds the title's runtime",
	})
	.constrains(bookmarkVO);

const startPlaybackSchema = playbackBC.addSchema("StartPlayback");
startPlaybackSchema.addAttribute("profileId", { type: "string" });
startPlaybackSchema.addAttribute("householdId", { type: "string" });
startPlaybackSchema.addAttribute("titleId", { type: "string" });
startPlaybackSchema.addAttribute("episodeId", { type: "string" });
startPlaybackSchema.addAttribute("deviceId", { type: "string" });
startPlaybackSchema.addAttribute("deviceModelId", { type: "string" });
const playbackStoppedSchema = playbackBC.addSchema("PlaybackStopped", {
	description: "The fact personalisation learns from",
});
playbackStoppedSchema.addAttribute("sessionId", {
	type: "string",
	identity: true,
});
playbackStoppedSchema.addAttribute("profileId", { type: "string" });
playbackStoppedSchema.addAttribute("titleId", { type: "string" });
playbackStoppedSchema.addAttribute("episodeId", { type: "string" });
playbackStoppedSchema.addAttribute("watchedSeconds", { type: "int" });
playbackStoppedSchema.addAttribute("completed", { type: "boolean" });

// DELIBERATE (schema-context): PlaybackStarted carries the catalogue's
// TitleRef schema. It was quicker than declaring Playback's own; the rule says
// a payload belongs to the context that publishes it.
const playbackStarted = sessionAgg.provides("PlaybackStarted", {
	description: "A session began; the ads tier prepares breaks",
	type: "event",
	pattern: "published-language",
	schema: titleRefSchema,
});
const playbackStopped = sessionAgg.provides("PlaybackStopped", {
	description: "A session ended, with how much was watched",
	type: "event",
	pattern: "published-language",
	schema: playbackStoppedSchema,
});
const bookmarkUpdated = sessionAgg.provides("BookmarkUpdated", {
	description: "The resume point moved; a player detail, not a business fact",
	type: "event",
	internal: true,
});
sessionAgg
	.provides("StartPlayback", {
		description: "Check entitlement and device, build the manifest, start",
		type: "operation",
		pattern: "open-host-service",
		schema: startPlaybackSchema,
	})
	.raises(playbackStarted);
sessionAgg
	.provides("StopPlayback", {
		description: "End the session and report what was watched",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(playbackStopped);
sessionAgg
	.provides("RecordHeartbeat", {
		description: "The player reports position every few seconds",
		type: "operation",
		internal: true,
	})
	.raises(bookmarkUpdated);

const bitrateSelector = playbackBC.addService("AdaptiveBitrateSelector", {
	description:
		"Picks the rung as the network changes; a domain service because it reasons over the whole ladder, not one session",
	type: "domain",
});
bitrateSelector.provides("SelectRendition", {
	description: "Choose the next segment's rendition",
	type: "operation",
	internal: true,
});

sessionAgg.consumes(getTitle, { pattern: "anti-corruption-layer" });

playbackBC.addTerm("Session", {
	definition: "One profile watching one title on one device",
	embodiedBy: sessionAgg,
});
playbackBC.addTerm("Bookmark", {
	definition: "Where playback resumes",
	aliases: ["Resume point"],
	embodiedBy: bookmarkVO,
});
// Devices' Device is a partner model; the player's device is one unit.
playbackBC.addTerm("Device", {
	definition:
		"The individual unit a session runs on. Devices' Device is the partner model it is an instance of, which is what certification is about",
	embodiedBy: sessionDevice,
});

/* =======================
   EDGE DELIVERY
   DISCOVERY: Edge Delivery lead. Appliances in ISPs; pre-position on encode;
   the format library is shared with Playback.
   ======================= */

const applianceAgg = edgeBC.addAggregate("EdgeAppliance", {
	description: "A cache box in an ISP and what it holds",
});
const appliance = applianceAgg.addRootEntity("EdgeAppliance", {
	description: "One box, one ISP, one region",
});
const cachedAsset = applianceAgg.addEntity("CachedAsset", {
	description: "One rendition on disk with its last hit time",
});
const capacityVO = applianceAgg.addValueObject("Capacity", {
	description: "Disk bytes available for cache",
});
capacityVO.addAttribute("bytes", { type: "int64" });
appliance.addAttribute("applianceId", { type: "string", identity: true });
appliance.addAttribute("ispName", { type: "string" });
appliance.addAttribute("region", {
	type: "string",
	description: "A cache region; not a licensing territory",
});
cachedAsset.addAttribute("renditionId", { type: "string", identity: true });
cachedAsset.addAttribute("bytes", { type: "int64" });
cachedAsset.addAttribute("lastHitAt", { type: "date-time" });
appliance.includes(cachedAsset, "caches", "*");
appliance.uses(capacityVO, "sized", "1");
applianceAgg
	.addInvariant("CachedBytesWithinCapacity", {
		description: "Cached bytes never exceed capacity; pre-positioning evicts",
	})
	.constrains(cachedAsset, capacityVO);

const resolveEdgeSchema = edgeBC.addSchema("ResolveEdge");
resolveEdgeSchema.addAttribute("clientIp", { type: "string" });
resolveEdgeSchema.addAttribute("renditionIds", { type: "string[]" });

const assetPrepositioned = applianceAgg.provides("AssetPrepositioned", {
	description: "A rendition was pushed to an appliance ahead of demand",
	type: "event",
	internal: true,
});
const resolveEdge = applianceAgg.provides("ResolveEdge", {
	description: "Which appliance a client should fetch from",
	type: "operation",
	pattern: "open-host-service",
	schema: resolveEdgeSchema,
});
const prepositionAsset = applianceAgg
	.provides("PrepositionAsset", {
		description: "Push a rendition to appliances predicted to need it",
		type: "operation",
		internal: true,
	})
	.raises(assetPrepositioned);

applianceAgg.consumes(encodingCompleted, { pattern: "conformist" });
edgeBC
	.addPolicy("Preposition on encode", {
		description:
			"New renditions are pushed to appliances by predicted popularity",
	})
	.on(encodingCompleted)
	.then(prepositionAsset);

// Shared kernel: the manifest format is one library, so Playback takes the answer as it is.
sessionAgg.consumes(resolveEdge, { pattern: "conformist" });

edgeBC.addTerm("Appliance", {
	definition: "A cache box installed in an ISP's network",
	aliases: ["Open cache box"],
	embodiedBy: applianceAgg,
});
edgeBC.addTerm("Region", {
	definition:
		"A group of appliances by network geography. Not a licensing territory",
	embodiedBy: appliance,
});

/* =======================
   DEVICES
   DISCOVERY: Partner Devices lead. No certification, no playback; the
   recertify-on-SDK rule is half written.
   ======================= */

const deviceAgg = devicesBC.addAggregate("Device", {
	description: "A partner device model and its certifications",
});
const device = deviceAgg.addRootEntity("Device", {
	description: "One model from one partner",
});
const certification = deviceAgg.addEntity("Certification", {
	description: "A pass or fail against one SDK version",
});
const capabilityVO = deviceAgg.addValueObject("Capability", {
	description: "Codecs, DRM level and maximum resolution",
});
capabilityVO.addAttribute("codecs", { type: "string[]" });
capabilityVO.addAttribute("drmLevel", { type: "string" });
capabilityVO.addAttribute("maxHeight", { type: "int" });
device.addAttribute("deviceId", { type: "string", identity: true });
device.addAttribute("partner", { type: "string" });
device.addAttribute("model", { type: "string" });
certification.addAttribute("sdkVersion", { type: "string", identity: true });
certification.addAttribute("passed", { type: "boolean" });
certification.addAttribute("certifiedOn", { type: "date" });
device.includes(certification, "certified-by", "*");
device.uses(capabilityVO, "capable-of", "1");
deviceAgg
	.addInvariant("CertifiedBeforePlayback", {
		description:
			"A device plays only with a passed certification against the current SDK",
	})
	.constrains(certification);
deviceAgg
	.addInvariant("CapabilitiesDeclared", {
		description: "A device is registered with its capabilities or not at all",
	})
	.constrains(capabilityVO);

const deviceCertifiedSchema = devicesBC.addSchema("DeviceCertified");
deviceCertifiedSchema.addAttribute("deviceId", {
	type: "string",
	identity: true,
});
deviceCertifiedSchema.addAttribute("sdkVersion", { type: "string" });
deviceCertifiedSchema.addAttribute("capability", {
	type: "Capability",
	valueobject: capabilityVO,
});

const deviceRegistered = deviceAgg.provides("DeviceRegistered", {
	description: "A partner submitted a model",
	type: "event",
	internal: true,
});
const deviceCertified = deviceAgg.provides("DeviceCertified", {
	description: "A model passed against an SDK version; Playback may use it",
	type: "event",
	pattern: "published-language",
	schema: deviceCertifiedSchema,
});
deviceAgg
	.provides("RegisterDevice", {
		description: "Submit a model with its capabilities",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(deviceRegistered);
deviceAgg
	.provides("Certify", {
		description: "Run the certification suite against an SDK",
		type: "operation",
		internal: true,
	})
	.raises(deviceCertified);

// DELIBERATE (policy-complete): the half-written automation. It reacts to a
// certification but issues nothing; the recertification operation was never added.
devicesBC
	.addPolicy("Recertify on SDK release", {
		description:
			"When a new SDK ships, every certified device should be recertified",
	})
	.on(deviceCertified);

// Partnership: releases are planned as one, so Playback conforms.
sessionAgg.consumes(deviceCertified, { pattern: "conformist" });

devicesBC.addTerm("Device", {
	definition: "A partner device model, not an individual unit",
	embodiedBy: deviceAgg,
});

/* =======================
   RECOMMENDATIONS
   DISCOVERY: Head of Personalisation. Signals from the profile's own viewing
   only; nothing from advertising, ever.
   ======================= */

const tasteAgg = recsBC.addAggregate("TasteProfile", {
	description: "What one profile has watched and what it is inferred to like",
});
const taste = tasteAgg.addRootEntity("TasteProfile", {
	description: "One per member profile",
});
const signal = tasteAgg.addEntity("Signal", {
	description:
		"One viewing fact with a weight and a time; an entity because signals decay and are audited",
});
const affinityVO = tasteAgg.addValueObject("Affinity", {
	description: "A genre or theme and how strongly the profile leans to it",
});
affinityVO.addAttribute("genre", { type: "string" });
affinityVO.addAttribute("score", { type: "float 0..1" });
taste.addAttribute("profileId", { type: "string", identity: true });
signal.addAttribute("signalId", { type: "string", identity: true });
signal.addAttribute("titleId", { type: "string" });
signal.addAttribute("kind", {
	type: "'watched' | 'completed' | 'abandoned' | 'rated'",
});
signal.addAttribute("weight", { type: "float" });
signal.addAttribute("at", { type: "date-time" });
taste.includes(signal, "built-from", "*");
taste.uses(affinityVO, "leans-to", "*");
// The Title root is in Catalogue, another bounded context, so the signal holds
// `titleId` and no relation.

tasteAgg
	.addInvariant("SignalsFromOwnProfileOnly", {
		description:
			"A taste profile holds signals from its own profile, never another in the household",
	})
	.constrains(signal);
tasteAgg
	.addInvariant("NoAdvertisingSignals", {
		description: "No signal originates from the ads tier; a public commitment",
	})
	.constrains(signal);

const recordSignal = tasteAgg.provides("RecordSignal", {
	description: "Add a viewing signal from a stopped session",
	type: "operation",
	internal: true,
});

const ranker = recsBC.addService("Ranker", {
	description:
		"Orders candidate titles into rows for a profile; a domain service because it reads across every taste profile's affinities",
	type: "domain",
});
ranker.provides("RankRows", {
	description: "Build the home screen rows for a profile",
	type: "operation",
	internal: true,
});
// DISCOVERY: Head of Personalisation ("we consume ... new titles"), peer
// review. The candidate pool is what the ranker orders; a title enters it when
// published and its availability decides which profiles may be shown it.
const addCandidate = ranker.provides("AddCandidate", {
	description:
		"Add or refresh a title in the candidate pool with the countries it is live in",
	type: "operation",
	internal: true,
});
const recsApi = recsBC.addService("RecommendationsAPI", {
	description: "What the apps call for the home screen",
	type: "application",
});
recsApi.provides("GetHomepageRows", {
	description: "Rows for a profile, ranked",
	type: "operation",
	pattern: "open-host-service",
});

tasteAgg.consumes(playbackStopped, { pattern: "anti-corruption-layer" });
ranker.consumes(titlePublished, { pattern: "conformist" });
ranker.consumes(availabilityChanged, { pattern: "conformist" });
recsBC
	.addPolicy("Add candidate on publish", {
		description:
			"A published title joins the candidate pool; an availability change updates where it may be recommended",
	})
	.on(titlePublished, availabilityChanged)
	.then(addCandidate);
// DELIBERATE (internal-consumable): Personalisation reads the player's
// bookmark updates, which Playback declares internal. The dependency was never agreed.
tasteAgg.consumes(bookmarkUpdated, { pattern: "anti-corruption-layer" });
recsBC
	.addPolicy("Record signal on stop", {
		description:
			"Every stopped session becomes a signal on the profile's taste",
	})
	.on(playbackStopped)
	.then(recordSignal);

recsBC.addTerm("Row", {
	definition: "A horizontal list on the home screen, ranked for one profile",
	embodiedBy: ranker,
});
recsBC.addTerm("Signal", {
	definition: "One viewing fact that shapes a taste profile",
	embodiedBy: signal,
});

/* =======================
   HOUSEHOLDS & PROFILES
   DISCOVERY: Member Experience lead. Up to five profiles, one primary, kids
   profiles capped; created when an account is created.
   ======================= */

const householdAgg = householdsBC.addAggregate("Household", {
	description:
		"The paying unit and the people in it; profile rules are checked across the household",
});
const household = householdAgg.addRootEntity("Household", {
	description: "One paying unit",
});
const profile = householdAgg.addEntity("Profile", {
	description: "One person's viewing identity",
});
const maturityVO = householdAgg.addValueObject("MaturitySetting", {
	description: "The highest rating a profile may play",
});
maturityVO.addAttribute("maxRating", { type: "string" });
const pinVO = householdAgg.addValueObject("ProfilePin", {
	description: "Four digits that unlock a profile or raise a maturity cap",
});
pinVO.addAttribute("hash", { type: "string" });
household.addAttribute("householdId", { type: "string", identity: true });
household.addAttribute("accountId", { type: "string" });
household.addAttribute("country", { type: "ISO 3166 code" });
profile.addAttribute("profileId", { type: "string", identity: true });
profile.addAttribute("name", { type: "string" });
profile.addAttribute("kids", { type: "boolean" });
profile.addAttribute("primary", { type: "boolean" });
household.includes(profile, "has-profiles", "1..*");
profile.uses(maturityVO, "limited-to", "1");
profile.uses(pinVO, "locked-by", "0..1");

householdAgg
	.addInvariant("MaxFiveProfiles", {
		description: "A household has at most five profiles",
	})
	.constrains(household);
householdAgg
	.addInvariant("OnePrimaryProfile", {
		description: "Exactly one profile is primary",
	})
	.constrains(profile);
householdAgg
	.addInvariant("KidsProfileMaturityCapped", {
		description:
			"A kids profile's maturity cap cannot be raised without the PIN; the profile's kids flag is what makes the rule apply",
	})
	.constrains(profile, maturityVO, pinVO);

const householdCreatedSchema = householdsBC.addSchema("HouseholdCreated");
householdCreatedSchema.addAttribute("householdId", {
	type: "string",
	identity: true,
});
householdCreatedSchema.addAttribute("accountId", { type: "string" });
householdCreatedSchema.addAttribute("country", { type: "ISO 3166 code" });
const profileCreatedSchema = householdsBC.addSchema("ProfileCreated");
profileCreatedSchema.addAttribute("profileId", {
	type: "string",
	identity: true,
});
profileCreatedSchema.addAttribute("householdId", { type: "string" });
profileCreatedSchema.addAttribute("kids", { type: "boolean" });

const householdCreated = householdAgg.provides("HouseholdCreated", {
	description: "A new paying unit exists, without a plan yet",
	type: "event",
	pattern: "published-language",
	schema: householdCreatedSchema,
});
const profileCreated = householdAgg.provides("ProfileCreated", {
	description: "A profile exists; personalisation starts a taste profile",
	type: "event",
	pattern: "published-language",
	schema: profileCreatedSchema,
});
const createHousehold = householdAgg
	.provides("CreateHousehold", {
		description:
			"Create the household and its primary profile for a new account",
		type: "operation",
		internal: true,
	})
	.raises(householdCreated, profileCreated);
householdAgg
	.provides("CreateProfile", {
		description: "Add a profile, within the limit",
		type: "operation",
		pattern: "open-host-service",
		schema: profileCreatedSchema,
	})
	.raises(profileCreated);

householdsBC.addTerm("Household", {
	definition:
		"The paying unit and its profiles. Identity's account is the login, not this",
	aliases: ["Account"],
	embodiedBy: householdAgg,
});
householdsBC.addTerm("Profile", {
	definition: "One person's viewing identity within a household",
	embodiedBy: profile,
});

tasteAgg.consumes(profileCreated, { pattern: "conformist" });

/* =======================
   BILLING & PLANS
   DISCOVERY: Commerce lead. One active subscription per household; invoice
   equals plan price; lapsed means no entitlement.
   ======================= */

const subscriptionAgg = billingBC.addAggregate("Subscription", {
	description: "A household on a plan, and its invoices",
});
const subscription = subscriptionAgg.addRootEntity("Subscription", {
	description: "The household's current arrangement",
});
const invoice = subscriptionAgg.addEntity("Invoice", {
	description: "One period's charge; an entity because it is numbered and paid",
});
const planVO = subscriptionAgg.addValueObject("Plan", {
	description: "A tier: price, concurrent streams, ad-supported or not",
});
const planMoney = money(subscriptionAgg);
planVO.addAttribute("tier", {
	type: "'basic-with-ads' | 'standard' | 'premium'",
});
planVO.addAttribute("price", { type: "Money", valueobject: planMoney });
planVO.addAttribute("maxStreams", { type: "int" });
planVO.addAttribute("adSupported", { type: "boolean" });
const periodVO = subscriptionAgg.addValueObject("BillingPeriod", {
	description: "The month an invoice covers",
});
periodVO.addAttribute("from", { type: "date" });
periodVO.addAttribute("to", { type: "date" });
subscription.addAttribute("subscriptionId", { type: "string", identity: true });
const subscriptionHousehold = subscription.addAttribute("householdId", {
	type: "string",
});
subscription.addAttribute("status", {
	type: "'active' | 'dunning' | 'lapsed'",
});
subscription.addAttribute("plan", { type: "Plan", valueobject: planVO });
invoice.addAttribute("invoiceId", { type: "string", identity: true });
invoice.addAttribute("lines", {
	type: "{source: 'subscription' | 'discs', amount: Money}[]",
	description: "The subscription line plus any line another business adds",
});
invoice.addAttribute("amount", {
	type: "Money",
	valueobject: planMoney,
	description: "The sum of the lines",
});
invoice.addAttribute("paid", { type: "boolean" });
subscription.includes(invoice, "billed-by", "*");
subscription.uses(planVO, "on-plan", "1");
invoice.uses(periodVO, "covers", "1");
invoice.uses(planMoney, "charges", "1");

// One Subscription cannot see its siblings, so the rule is enforced where a
// subscription is created: StartSubscription refuses a household that already
// has an active one, keyed on householdId.
subscriptionAgg
	.addInvariant("OneActiveSubscriptionPerHousehold", {
		description:
			"A household has at most one active subscription; enforced by StartSubscription on householdId, since one subscription cannot see another",
	})
	.constrains(subscriptionHousehold);
// DISCOVERY: Commerce lead, peer review. "Equals the plan price" was said of
// the subscription line; the disc export adds a separate line, so the invoice
// total is the sum of its lines.
subscriptionAgg
	.addInvariant("SubscriptionLineEqualsPlanPrice", {
		description:
			"The subscription line on an invoice is exactly the plan price for its period; other lines of business (the disc charge) add their own lines and the total is their sum",
	})
	.constrains(invoice, planVO);
subscriptionAgg
	.addInvariant("NoEntitlementWhenLapsed", {
		description: "A lapsed subscription entitles nothing",
	})
	.constrains(subscription);

const subscriptionSchema = billingBC.addSchema("SubscriptionRef");
subscriptionSchema.addAttribute("subscriptionId", {
	type: "string",
	identity: true,
});
subscriptionSchema.addAttribute("householdId", { type: "string" });
const entitlementSchema = billingBC.addSchema("EntitlementRequest", {
	description: "What Playback asks: which household, for how many streams",
});
entitlementSchema.addAttribute("householdId", { type: "string" });

const subscriptionActivated = subscriptionAgg.provides(
	"SubscriptionActivated",
	{
		description: "A household is paying",
		type: "event",
		pattern: "published-language",
		schema: subscriptionSchema,
	},
);
const subscriptionLapsed = subscriptionAgg.provides("SubscriptionLapsed", {
	description: "Dunning failed; entitlement ends",
	type: "event",
	pattern: "published-language",
	schema: subscriptionSchema,
});
const paymentFailed = subscriptionAgg.provides("PaymentFailed", {
	description: "A renewal charge bounced",
	type: "event",
	internal: true,
});
subscriptionAgg
	.provides("StartSubscription", {
		description: "Put a household on a plan",
		type: "operation",
		pattern: "open-host-service",
		schema: subscriptionSchema,
	})
	.raises(subscriptionActivated);
const getEntitlement = subscriptionAgg.provides("GetEntitlement", {
	description: "Whether a household may stream, and how many at once",
	type: "operation",
	pattern: "open-host-service",
	schema: entitlementSchema,
});
subscriptionAgg
	.provides("ChargeRenewal", {
		description: "Invoice and charge the next period",
		type: "operation",
		internal: true,
	})
	.raises(paymentFailed);
const startDunning = subscriptionAgg.provides("StartDunning", {
	description: "Retry the charge over a grace period",
	type: "operation",
	internal: true,
});
subscriptionAgg
	.provides("LapseSubscription", {
		description: "End entitlement after dunning fails",
		type: "operation",
		internal: true,
	})
	.raises(subscriptionLapsed);
const addInvoiceLine = subscriptionAgg.provides("AddInvoiceLine", {
	description:
		"Add a charge from another line of business to the household's bill",
	type: "operation",
	internal: true,
});

// DISCOVERY: event storming ("Billing awaits plan"), peer review. The
// consumption had no reaction; this is what billing does with a new household.
const registerHousehold = subscriptionAgg.provides("RegisterHousehold", {
	description:
		"Record a household with no plan yet, so StartSubscription can find it and one-subscription-per-household can be checked",
	type: "operation",
	internal: true,
});
subscriptionAgg.consumes(householdCreated, { pattern: "conformist" });
billingBC
	.addPolicy("Await plan on household", {
		description:
			"A new household is registered in billing until it picks a plan",
	})
	.on(householdCreated)
	.then(registerHousehold);
billingBC
	.addPolicy("Dun on failed payment", {
		description:
			"A failed renewal starts the grace period, not an immediate lapse",
	})
	.on(paymentFailed)
	.then(startDunning);

// Playback asks billing before every start, translating the answer to its own yes/no.
sessionAgg.consumes(getEntitlement, { pattern: "anti-corruption-layer" });

billingBC.addTerm("Plan", {
	definition: "A tier with a price, a stream limit and whether it carries ads",
	embodiedBy: planVO,
});
billingBC.addTerm("Entitlement", {
	definition: "The right to stream, derived from an active subscription",
	embodiedBy: getEntitlement,
});

/* =======================
   IDENTITY
   ======================= */

const accountAgg = identityBC.addAggregate("Account", {
	description: "A login",
});
const account = accountAgg.addRootEntity("Account", {
	description: "Email and credentials",
});
account.addAttribute("accountId", { type: "string", identity: true });
account.addAttribute("email", { type: "string" });
const accountCreatedSchema = identityBC.addSchema("AccountCreated");
accountCreatedSchema.addAttribute("accountId", {
	type: "string",
	identity: true,
});
accountCreatedSchema.addAttribute("country", { type: "ISO 3166 code" });
const accountCreated = accountAgg.provides("AccountCreated", {
	description: "Someone signed up",
	type: "event",
	pattern: "published-language",
	schema: accountCreatedSchema,
});
const identityApi = identityBC.addService("IdentityAPI", {
	description: "Sign-up and sign-in",
	type: "application",
});
identityApi
	.provides("CreateAccount", {
		description: "Sign up",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(accountCreated);
identityApi.provides("SignIn", {
	description: "Authenticate",
	type: "operation",
	pattern: "open-host-service",
});
// The other side of the Account / Household collision, recorded here too.
identityBC.addTerm("Account", {
	definition:
		"The login: an email and credentials. Members say account for the household; that is Households' Household",
	embodiedBy: accountAgg,
});

householdAgg.consumes(accountCreated, { pattern: "conformist" });
householdsBC
	.addPolicy("Create household on account", {
		description: "Every new account gets a household and a primary profile",
	})
	.on(accountCreated)
	.then(createHousehold);

/* =======================
   ADS TIER
   DISCOVERY: Ads Team lead. Ninety-second breaks, no repeated creative, only
   on the ad-supported plan; no viewing signals, by decision.
   ======================= */

const breakAgg = adsBC.addAggregate("AdBreak", {
	description: "A pod of slots at a position in a session",
});
const adBreak = breakAgg.addRootEntity("AdBreak", {
	description: "One break in one session",
});
const adSlot = breakAgg.addEntity("AdSlot", {
	description: "One creative in the break",
});
const advertiserVO = breakAgg.addValueObject("Advertiser", {
	description: "Who paid for the creative",
});
advertiserVO.addAttribute("name", { type: "string" });
const frequencyCapVO = breakAgg.addValueObject("FrequencyCap", {
	description:
		"The creative's rule for how often one household may see it in a day. The break carries the rule; PrepareBreaks applies it against the household's impressions so far today, which a single break cannot hold",
});
frequencyCapVO.addAttribute("maxPerDay", { type: "int" });
adBreak.addAttribute("breakId", { type: "string", identity: true });
adBreak.addAttribute("sessionId", { type: "string" });
// DISCOVERY: Ads Team lead ("we work with plan and country"), peer review.
// The plan is what the ad-supported rule reads, so the break records it.
adBreak.addAttribute("householdId", { type: "string" });
const breakPlanTier = adBreak.addAttribute("planTier", {
	type: "'basic-with-ads' | 'standard' | 'premium'",
	description:
		"The household's plan at the time the breaks were prepared, from GetEntitlement",
});
adBreak.addAttribute("country", { type: "ISO 3166 code" });
adBreak.addAttribute("positionSeconds", { type: "int" });
adSlot.addAttribute("slotId", { type: "string", identity: true });
adSlot.addAttribute("creativeId", { type: "string" });
adSlot.addAttribute("durationSeconds", { type: "int" });
adBreak.includes(adSlot, "filled-by", "1..*");
adSlot.uses(advertiserVO, "paid-by", "1");
adSlot.uses(frequencyCapVO, "capped", "1");

breakAgg
	.addInvariant("BreakDurationCap", {
		description: "A break is at most ninety seconds",
	})
	.constrains(adBreak, adSlot);
breakAgg
	.addInvariant("NoRepeatCreativeWithinBreak", {
		description: "A creative appears at most once per break",
	})
	.constrains(adSlot);
breakAgg
	.addInvariant("AdsOnlyOnAdSupportedPlan", {
		description:
			"Breaks exist only for sessions whose planTier is ad-supported; the tier comes from billing's entitlement answer",
	})
	.constrains(breakPlanTier);

const resolveBreakSchema = adsBC.addSchema("ResolveAdBreak");
resolveBreakSchema.addAttribute("sessionId", { type: "string" });
resolveBreakSchema.addAttribute("positionSeconds", { type: "int" });
const impressionSchema = adsBC.addSchema("AdImpressionRecorded", {
	description: "What advertiser billing consumes; out of scope here",
});
impressionSchema.addAttribute("slotId", { type: "string", identity: true });
impressionSchema.addAttribute("creativeId", { type: "string" });
impressionSchema.addAttribute("at", { type: "date-time" });

const impressionRecorded = breakAgg.provides("AdImpressionRecorded", {
	description: "A creative was shown",
	type: "event",
	pattern: "published-language",
	schema: impressionSchema,
});
const resolveAdBreak = breakAgg.provides("ResolveAdBreak", {
	description: "The slots for a break the player has reached",
	type: "operation",
	pattern: "open-host-service",
	schema: resolveBreakSchema,
});
const prepareBreaks = breakAgg.provides("PrepareBreaks", {
	description:
		"Plan the breaks for a session by plan and country: ask billing for the household's plan, skip if it is not ad-supported, and fill slots within each creative's daily cap",
	type: "operation",
	internal: true,
});
breakAgg
	.provides("RecordImpression", {
		description: "The player confirmed a creative played",
		type: "operation",
		internal: true,
	})
	.raises(impressionRecorded);

breakAgg.consumes(playbackStarted, { pattern: "anti-corruption-layer" });
// The plan is billing's fact; Ads asks for it the same way Playback does.
breakAgg.consumes(getEntitlement, { pattern: "anti-corruption-layer" });
adsBC
	.addPolicy("Prepare breaks on start", {
		description:
			"Breaks are planned when the session starts, before the first one is reached",
	})
	.on(playbackStarted)
	.then(prepareBreaks);
sessionAgg.consumes(resolveAdBreak, { pattern: "anti-corruption-layer" });

adsBC.addTerm("Pod", {
	definition: "A break's worth of slots. The player says break",
	aliases: ["Break"],
	embodiedBy: breakAgg,
});
adsBC.addTerm("Impression", {
	definition: "One creative shown once",
	embodiedBy: impressionRecorded,
});

/* =======================
   DISC RENTAL (legacy)
   ======================= */

const queueAgg = discsBC.addAggregate("RentalQueue", {
	description: "As far as anyone knows, the central table",
});
const queue = queueAgg.addRootEntity("RentalQueue", {
	description: "A member's ordered list of discs",
});
queue.addAttribute("legacyAccountId", { type: "string", identity: true });

const discInvoicedSchema = discsBC.addSchema("DiscRentalInvoiced", {
	description: "The monthly export's shape",
});
discInvoicedSchema.addAttribute("legacyAccountId", {
	type: "string",
	identity: true,
});
discInvoicedSchema.addAttribute("amountMinor", { type: "int64" });
const discRentalInvoiced = queueAgg.provides("DiscRentalInvoiced", {
	description: "The monthly disc charge for a member",
	type: "event",
	pattern: "published-language",
	schema: discInvoicedSchema,
});

subscriptionAgg.consumes(discRentalInvoiced, {
	pattern: "anti-corruption-layer",
});
billingBC
	.addPolicy("Add disc charge to bill", {
		description:
			"The legacy export is translated into an invoice line on the household",
	})
	.on(discRentalInvoiced)
	.then(addInvoiceLine);

/* =======================
   CONTEXT RELATIONSHIPS
   DISCOVERY section 6.
   ======================= */

catalogueBC.downstreamOf(studioBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
encodingBC.downstreamOf(studioBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description:
		"The delivery spec is the industry format; translating it would be pointless",
});
catalogueBC.downstreamOf(licensingBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
// One relationship for both exchanges: Catalogue calls SubmitEncode and
// reacts to EncodingCompleted, translating both, and is consulted on both
// contracts. Two declarations in the same direction said less than this one.
encodingBC.upstreamOf(catalogueBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Catalogue is the caller of SubmitEncode and the main reader of EncodingCompleted; it is consulted on both contracts",
});
edgeBC.downstreamOf(encodingBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
playbackBC.downstreamOf(catalogueBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});
recsBC.downstreamOf(catalogueBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
recsBC.downstreamOf(playbackBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Stopped sessions become signals; see the internal-consumable error for the bookmark feed",
});
recsBC.downstreamOf(householdsBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
playbackBC.downstreamOf(billingBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Entitlement is asked before every start; Playback is consulted on the contract",
});
adsBC.downstreamOf(playbackBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
// Playback and Ads are each downstream of the other: the start event flows
// one way, the break lookup the other. Two directed relationships say that
// honestly; neither side owns the other's contract.
playbackBC.downstreamOf(adsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Breaks are resolved when reached",
});
adsBC.downstreamOf(billingBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "The household's plan decides whether there are breaks at all",
});
householdsBC.downstreamOf(identityBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
billingBC.downstreamOf(householdsBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
billingBC.downstreamOf(discsBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"The monthly export is translated; nothing else of Discs is touched",
});

// Shared kernel: one manifest and segment format library, changed by both.
playbackBC.sharesKernelWith(edgeBC, {
	description:
		"Manifest and segment formats are one library; the 2019 split was reverted",
	disposition: "tolerated",
	comments: [
		{
			text: "Manifest and segment parsing live in @streamline/manifest; the player and the edge both link it.",
			link: {
				kind: "code",
				url: "https://github.com/example/streamline/blob/main/packages/manifest/src/Manifest.ts",
				label: "packages/manifest/src/Manifest.ts",
			},
		},
		{
			text: "The 2019 attempt to give each side its own parser produced two subtly different players and was reverted.",
			link: {
				kind: "adr",
				url: "https://github.com/example/streamline/blob/main/docs/adr/009-one-manifest-parser.md",
				label: "ADR-009 One manifest parser",
			},
		},
	],
});
// Partnership: SDK and player versioned, certified and released together.
playbackBC.partnerOf(devicesBC, {
	description:
		"Player and device SDK ship as one release; certification is joint",
	comments: [
		{
			text: "One release train: the player and the device SDK are versioned together and certified in the same lab run.",
			link: {
				kind: "runbook",
				url: "https://github.com/example/streamline/blob/main/docs/runbooks/joint-certification.md",
				label: "Joint certification runbook",
			},
		},
	],
});
// Separate ways: a public commitment, enforced by having no integration at all.
adsBC.separateWaysFrom(recsBC, {
	description:
		"Advertising is never a ranking signal and recommendations never reach ads",
});
