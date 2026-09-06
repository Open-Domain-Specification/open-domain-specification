import {
	type BoundedContext,
	Workspace,
} from "@open-domain-specification/core";

/**
 * Money, declared once in each context that carries an amount: a value object
 * belongs to the context's language, and every aggregate in that context
 * holds the same one.
 */
const money = (boundedcontext: BoundedContext) => {
	const vo = boundedcontext.addValueObject("Money", {
		description: "An amount in a currency: minor units and an ISO 4217 code",
	});
	vo.addAttribute("amountMinor", { type: "int64" });
	vo.addAttribute("currency", { type: "ISO 4217 code" });
	return vo;
};

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
 * legacy big ball of mud (the disc business), and three deliberate findings
 * (marked DELIBERATE) that trigger policy-complete, schema-context and
 * internal-consumable.
 *
 * Provenance: BRIEF.md and DISCOVERY.md. Comments "DISCOVERY: <who>" point at
 * the interview an element came from.
 */
export const workspace = new Workspace("StreamLine", {
	id: "streamline",
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

// The companies StreamLine licenses from and takes delivery from. The portal
// interview already said "external post houses use it too" and the deals are
// "with a licensor"; neither was anywhere in the model. They are one context
// StreamLine does not own: no subdomain, no team, no insides (decision 28).
const licensorsBC = workspace.addBoundedContext("Licensors & Post Houses", {
	description:
		"The studios, distributors and post houses StreamLine licenses titles from and takes masters from. Somebody else's businesses; only what they do at our edge is modelled",
	external: true,
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
const budgetVO = studioBC.addValueObject("Budget", {
	description:
		"Approved spend; a value because two productions with the same figures have the same budget",
});
const budgetMoney = money(studioBC);
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
production.addAttribute("budget", {
	type: "Budget",
	valueobject: budgetVO,
});
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
masterDeliveredSchema.addAttribute("episodeNumber", {
	type: "int",
	identifies: studioEpisode,
});
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
const submitDelivery = studioPortal
	.provides("SubmitDelivery", {
		description: "Upload a master against a production and episode",
		type: "operation",
		pattern: "open-host-service",
		schema: masterDeliveredSchema,
	})
	.raises(masterDelivered);
// DISCOVERY: Head of Studio Technology. "External post houses use it too", so
// the portal has a caller outside the company, delivering to StreamLine's spec
// without negotiating it, which is what a conformist is (card 71).
licensorsBC
	.addService("Licensor Delivery", {
		description:
			"However a licensor or post house gets a master to us; all StreamLine sees is the upload",
		type: "application",
	})
	.consumes(submitDelivery, { pattern: "conformist" });
studioBC.upstreamOf(licensorsBC, {
	description:
		"The delivery spec is StreamLine's and it is published; a licensor delivers to it or the master is not accepted",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});

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
const territoryVO = licensingBC.addValueObject("Territory", {
	description: "A set of countries a window covers. Not a cache region",
});
territoryVO.addAttribute("countries", { type: "ISO 3166 code[]" });
const feeMoney = money(licensingBC);
deal.addAttribute("dealId", { type: "string", identity: true });
deal.addAttribute("licensor", { type: "string" });
deal.addAttribute("termStart", { type: "date" });
deal.addAttribute("termEnd", { type: "date" });
deal.addAttribute("fee", { type: "Money", valueobject: feeMoney });
window.addAttribute("windowId", { type: "string", identity: true });
// `titleId` is declared with the Title root further down, because the root it
// identifies has to exist before the attribute can name it.
window.addAttribute("start", { type: "date" });
window.addAttribute("end", { type: "date" });
window.addAttribute("exclusive", { type: "boolean" });
deal.includes(window, "grants", "1..*");
window.addAttribute("territory", {
	type: "Territory",
	valueobject: territoryVO,
});
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
// `titleId` is declared with the Title root further down.
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
	description:
		"What a member browses to: a name, a rating, artwork and where it plays. No title is ever just a Title; every one of them is a film or a series",
});
// DISCOVERY: Catalogue Team lead, "a title is a film or a series; a series has
// seasons and seasons have episodes". The two kinds hold different things — a
// film plays one encode, a series plays through its episodes — so they are
// kinds of Title rather than one entity with a `kind` flag and attributes that
// apply only sometimes (decision 22).
const film = titleAgg.addEntity("Film", {
	description: "A title a member watches in one sitting, playing one encode",
	specialises: title,
});
const series = titleAgg.addEntity("Series", {
	description: "A title watched an episode at a time, through its seasons",
	specialises: title,
});
const season = titleAgg.addEntity("Season", {
	description: "A numbered group of episodes",
});
const catalogueEpisode = titleAgg.addEntity("Episode", {
	description:
		"What a member plays; carries artwork and a rating, unlike the studio's episode",
});
const artworkVO = catalogueBC.addValueObject("Artwork", {
	description: "Images by aspect ratio",
});
artworkVO.addAttribute("images", { type: "{ratio, uri}[]" });
const ratingVO = catalogueBC.addValueObject("MaturityRating", {
	description: "The rating shown and enforced by profile maturity settings",
});
ratingVO.addAttribute("scheme", { type: "string" });
ratingVO.addAttribute("value", { type: "string" });
const availabilityVO = catalogueBC.addValueObject("Availability", {
	description:
		"Countries and dates a title is live, derived from licence windows or studio ownership",
});
availabilityVO.addAttribute("countries", { type: "ISO 3166 code[]" });
availabilityVO.addAttribute("from", { type: "date" });
availabilityVO.addAttribute("until", { type: "date" });
title.addAttribute("titleId", { type: "string", identity: true });
// `titleId` on Window and LicenseWindow is declared here, because an
// attribute can only name a root that already exists and this is where the
// Title root is. Licensing is another bounded context, so this identity is
// the whole of what those hold of a title.
window.addAttribute("titleId", { type: "string", identifies: title });
windowSchema.addAttribute("titleId", {
	type: "string",
	identity: true,
	identifies: title,
});
title.addAttribute("name", { type: "string" });
title.addAttribute("rating", { type: "MaturityRating", valueobject: ratingVO });
// DISCOVERY: Catalogue Team lead, peer review. The correlation keys: a
// delivered master names a production and an episode number, and the
// catalogue must find its own title and episode from them. Licensed titles
// have no production; their masters arrive through the licensor.
title.addAttribute("productionId", {
	type: "string",
	optional: true,
	description:
		"The studio production behind an original, or absent for a licensed title; how MasterDelivered is matched to a title",
	identifies: production,
});
film.addAttribute("playableRenditionSet", {
	type: "string",
	description:
		"The encoding job whose renditions this film plays; a series plays through its episodes instead",
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
	optional: true,
	description:
		"An episode may be rated above its series; absent means the series rating",
});
// Seasons hang off the series, not off every title: a film has none, and the
// "*" that used to say so said nothing about which titles it meant.
series.includes(season, "has-seasons", "1..*");
season.includes(catalogueEpisode, "has-episodes", "1..*");
title.addAttribute("artwork", {
	type: "Artwork",
	valueobject: artworkVO,
});
title.addAttribute("availability", {
	type: "Availability[]",
	valueobject: availabilityVO,
	optional: true,
	description:
		"One entry per territory and window the title is playable in; absent while nothing is licensed",
});
catalogueEpisode.addAttribute("artwork", {
	type: "Artwork",
	valueobject: artworkVO,
	optional: true,
	description:
		"An episode may carry its own still; absent means the series artwork",
});
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
// The schema identifies one title and, for a series, one episode of it.
titleRefSchema.addAttribute("episodeId", {
	type: "string",
	optional: true,
	identifies: catalogueEpisode,
});
// A returned shape: GetTitle is asked with a TitleRef and answers with this.
const titleDetailSchema = catalogueBC.addSchema("TitleDetail", {
	description: "A title with its seasons, episodes and availability",
});
titleDetailSchema.addAttribute("titleId", { type: "string", identity: true });
titleDetailSchema.addAttribute("name", { type: "string" });
// The payload keeps the discriminator the model no longer needs: a caller
// reading JSON has no kinds to dispatch on, so the wire says which it is.
titleDetailSchema.addAttribute("kind", { type: "'film' | 'series'" });
titleDetailSchema.addAttribute("rating", {
	type: "MaturityRating",
	valueobject: ratingVO,
});
titleDetailSchema.addAttribute("artwork", {
	type: "Artwork",
	valueobject: artworkVO,
});
titleDetailSchema.addAttribute("availability", {
	type: "Availability",
	valueobject: availabilityVO,
});
// A film carries none: the wire's own `kind` tells a film from a series, and
// `seasons` is honest about the shape only when a film's absence of the field
// is stated rather than implied (decision 24; card 119).
titleDetailSchema.addAttribute("seasons", {
	type: "Season[]",
	optional: true,
});
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
	description:
		"Asked with a TitleRef, answers with the title's seasons, episodes and availability",
	type: "operation",
	pattern: "open-host-service",
	schema: titleRefSchema,
	returns: titleDetailSchema,
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
const ladderVO = encodingBC.addValueObject("Ladder", {
	description:
		"The planned rungs: bitrate and resolution pairs chosen for this title's content",
});
const ladderRungs = ladderVO.addAttribute("rungs", {
	type: "{bitrateKbps, height}[]",
});
// The value's own rule: a ladder without a low rung is not a ladder anything
// may be encoded against, and it is refused when the ladder is made.
ladderVO
	.addInvariant("LadderHasLowestRung", {
		description:
			"Every ladder has a rung under 300 kbit/s so a stream starts on a bad network",
	})
	.constrains(ladderRungs);
job.addAttribute("jobId", { type: "string", identity: true });
job.addAttribute("titleId", { type: "string", identifies: title });
job.addAttribute("sourceUri", { type: "string (URI)" });
job.addAttribute("status", {
	type: "'queued' | 'running' | 'completed' | 'failed'",
});
rendition.addAttribute("renditionId", { type: "string", identity: true });
rendition.addAttribute("codec", { type: "string" });
rendition.addAttribute("bitrateKbps", { type: "int" });
rendition.addAttribute("height", { type: "int" });
job.includes(rendition, "produces", "*");
job.addAttribute("ladder", {
	type: "Ladder",
	valueobject: ladderVO,
});
job.uses(ladderVO, "planned-as", "1");

jobAgg
	.addInvariant("RenditionsMatchLadder", {
		description: "A completed job has exactly one rendition per planned rung",
	})
	.constrains(rendition, ladderVO);

const submitEncodeSchema = encodingBC.addSchema("SubmitEncode");
submitEncodeSchema.addAttribute("titleId", {
	type: "string",
	identifies: title,
});
submitEncodeSchema.addAttribute("sourceUri", { type: "string (URI)" });
const encodingCompletedSchema = encodingBC.addSchema("EncodingCompleted", {
	description: "The rendition list the catalogue and the edge react to",
});
encodingCompletedSchema.addAttribute("jobId", {
	type: "string",
	identity: true,
});
encodingCompletedSchema.addAttribute("titleId", {
	type: "string",
	identifies: title,
});
encodingCompletedSchema.addAttribute("renditionIds", {
	type: "string[]",
	identifies: rendition,
});

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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const encodingApi = encodingBC.addService("EncodingAPI", {
	description:
		"Encoding's application service: the boundary Catalogue queues masters through",
	type: "application",
});
const submitEncode = encodingApi
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
// DISCOVERY: Media Engineering lead, "we consume the studio's delivery spec as
// it is", and the Head of Studio Technology, "the catalogue and the encoding
// pipeline both react". What the pipeline does on a delivery is note the
// mezzanine as a source it can encode from; the job itself is queued later,
// under a titleId, by Catalogue's call to SubmitEncode. Naming SubmitEncode as
// the subscriber named a thing that is issued rather than woken, and left the
// reaction the studio lead described unwritten (`consumption-by-reactor`,
// card 98).
const recordDeliveredMaster = encodingApi.provides("RecordDeliveredMaster", {
	description:
		"Note a delivered mezzanine as a source the pipeline can encode from, read in the studio's delivery spec as it stands",
	type: "operation",
	internal: true,
});
const noteDeliveredMaster = encodingBC
	.addPolicy("Note a delivered master", {
		description:
			"Every delivered mezzanine becomes a source the pipeline knows about, ready for the encode Catalogue queues",
	})
	.on(masterDelivered)
	.issues(recordDeliveredMaster);
encodingApi.consumes(masterDelivered, {
	pattern: "conformist",
	by: [noteDeliveredMaster],
});
encodingBC
	.addPolicy("Plan ladder on queue", {
		description: "Every queued job gets a per-title ladder before it runs",
	})
	.on(encodeQueued)
	.issues(planLadder);

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
catalogueApi.consumes(masterDelivered, { pattern: "anti-corruption-layer" });
catalogueApi.consumes(encodingCompleted, { pattern: "anti-corruption-layer" });
catalogueApi.consumes(windowOpened, { pattern: "anti-corruption-layer" });
catalogueApi.consumes(windowExpired, { pattern: "anti-corruption-layer" });
// The call out to Encoding is made by Catalogue's own application service,
// and it is that operation the policy below names (decision 17).
const requestEncode = catalogueApi.provides("RequestEncode", {
	description:
		"Queue the matched title for encoding, by calling Encoding's SubmitEncode behind the ACL",
	type: "operation",
	internal: true,
});
// CatalogueAPI answers GetTitle as well as queueing encodes, so which of the
// two makes the call is a real question: RequestEncode does, and the chain from
// a delivered master through the encode to the publication runs through it
// (decision 21, third amendment).
catalogueApi.consumes(submitEncode, {
	pattern: "anti-corruption-layer",
	by: [requestEncode],
});
// Getting a title on the service is a process, not two policies: it holds the
// match from productionId to titleId while the encode runs, which is the one
// thing a stateless policy could not carry from the master to the publication.
catalogueBC
	.addProcess("Master to publication", {
		description:
			"From a delivered master to a title members can play. The master is matched to the title by productionId (and the episode by masterEpisodeNumber) and queued for encoding under that titleId; the process then waits, sometimes for hours, and publishes the title when the encode comes back. Correlation is by that titleId, which it remembers for the encode's whole run; a ladder that never completes is chased by the operations team, so nothing here times out",
	})
	.starts(masterDelivered)
	.on(encodingCompleted)
	.issues(requestEncode, publishTitle)
	.ends(titlePublished);
catalogueBC
	.addPolicy("Update availability on window", {
		description: "An opened window changes where the title is live",
	})
	.on(windowOpened)
	.issues(updateAvailability);
catalogueBC
	.addPolicy("Unpublish on expiry", {
		description: "An expired window takes the title down that day",
	})
	.on(windowExpired)
	.issues(unpublishTitle);

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
const bookmarkVO = playbackBC.addValueObject("Bookmark", {
	description:
		"The resume point; updated every few seconds, kept inside the player",
});
bookmarkVO.addAttribute("positionSeconds", { type: "int" });
const manifestVO = playbackBC.addValueObject("StreamManifest", {
	description:
		"The renditions and the edge to fetch from, in the format shared with Edge Delivery",
});
manifestVO.addAttribute("renditionIds", {
	type: "string[]",
	identifies: rendition,
});
manifestVO.addAttribute("edgeUrl", { type: "string (URL)" });
session.addAttribute("sessionId", { type: "string", identity: true });
// DISCOVERY: peer review. The household is what entitlement and the stream
// limit are about, and a series is watched an episode at a time, so both
// identities belong on the session. `householdId`, the invariant that reads
// it and `deviceModelId` are declared further down, with the Household and
// Device roots they identify.
session.addAttribute("titleId", { type: "string", identifies: title });
session.addAttribute("episodeId", {
	type: "string",
	optional: true,
	description:
		"Absent for a film; for a series, the episode being played and bookmarked",
	identifies: catalogueEpisode,
});
const sessionDevice = session.addAttribute("deviceId", {
	type: "string",
	description: "The individual unit (an installation), not the partner model",
});
session.addAttribute("bookmark", { type: "Bookmark", valueobject: bookmarkVO });
session.addAttribute("manifest", {
	type: "StreamManifest",
	valueobject: manifestVO,
});
session.uses(bookmarkVO, "resumes-at", "1");
session.uses(manifestVO, "streams-from", "1");
// The Title root is in Catalogue, another bounded context: a relation never
// crosses one, so the session holds `titleId` and nothing more.

// `SessionNeedsEntitlement` is declared further down, with PlaybackAPI: the
// entitlement is checked at the moment of the call and StartPlayback is the
// operation that checks it, so the invariant names it rather than leaving the
// guard in prose (decision 19, amended).
// `WithinStreamLimit` is declared with the Household root further down,
// because it constrains `householdId`, and that attribute can only be
// declared once the root it identifies exists.
sessionAgg
	.addInvariant("BookmarkWithinRuntime", {
		description: "The resume point never exceeds the title's runtime",
	})
	.constrains(bookmarkVO);

const startPlaybackSchema = playbackBC.addSchema("StartPlayback");
// `profileId` and `householdId` are declared with the Profile and Household
// roots further down; `deviceModelId` with the Device root.
startPlaybackSchema.addAttribute("titleId", {
	type: "string",
	identifies: title,
});
startPlaybackSchema.addAttribute("episodeId", {
	type: "string",
	optional: true,
	identifies: catalogueEpisode,
});
startPlaybackSchema.addAttribute("deviceId", { type: "string" });
// A rejection shape: what StartPlayback answers with when it will not start.
// No session exists, so there is no PlaybackStarted to raise; the player is
// told whether to send the member to billing or to say the device is not
// certified (decision 25).
const playbackDeniedSchema = playbackBC.addSchema("PlaybackDenied", {
	description:
		"Why the session did not start: no entitlement, or a device that is not certified",
});
playbackDeniedSchema.addAttribute("reason", { type: "string" });
playbackDeniedSchema.addAttribute("titleId", {
	type: "string",
	identifies: title,
});
const playbackStoppedSchema = playbackBC.addSchema("PlaybackStopped", {
	description: "The fact personalisation learns from",
});
playbackStoppedSchema.addAttribute("sessionId", {
	type: "string",
	identity: true,
});
// `profileId` is declared with the Profile root further down.
playbackStoppedSchema.addAttribute("titleId", {
	type: "string",
	identifies: title,
});
playbackStoppedSchema.addAttribute("episodeId", {
	type: "string",
	optional: true,
	identifies: catalogueEpisode,
});
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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const playbackApi = playbackBC.addService("PlaybackAPI", {
	description:
		"Playback's application service: the boundary players start and stop sessions through",
	type: "application",
});
const startPlayback = playbackApi
	.provides("StartPlayback", {
		description: "Check entitlement and device, build the manifest, start",
		type: "operation",
		pattern: "open-host-service",
		schema: startPlaybackSchema,
		rejects: [playbackDeniedSchema],
	})
	.raises(playbackStarted);
playbackApi
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

playbackApi.consumes(getTitle, {
	pattern: "anti-corruption-layer",
	by: [startPlayback],
});
// A rule about one session, so it is the aggregate's; checked before the
// session exists, so what upholds it is StartPlayback on the application
// service, which is where the entitlement read happens (decision 19, amended).
sessionAgg
	.addInvariant("SessionNeedsEntitlement", {
		description:
			"A session starts only with a current entitlement from billing, read by StartPlayback through GetEntitlement before the session is created",
		// The entitlement may lapse while the session runs, and nothing here
		// re-establishes it: it is checked at the call and no later (card 94).
		precondition: true,
	})
	.constrains(session, startPlayback);

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
const capacityVO = edgeBC.addValueObject("Capacity", {
	description: "Disk bytes available for cache",
});
capacityVO.addAttribute("bytes", { type: "int64" });
appliance.addAttribute("applianceId", { type: "string", identity: true });
appliance.addAttribute("ispName", { type: "string" });
appliance.addAttribute("region", {
	type: "string",
	description: "A cache region; not a licensing territory",
});
cachedAsset.addAttribute("renditionId", {
	type: "string",
	identity: true,
	identifies: rendition,
});
cachedAsset.addAttribute("bytes", { type: "int64" });
cachedAsset.addAttribute("lastHitAt", { type: "date-time" });
appliance.includes(cachedAsset, "caches", "*");
appliance.addAttribute("capacity", {
	type: "Capacity",
	valueobject: capacityVO,
});
appliance.uses(capacityVO, "sized", "1");
applianceAgg
	.addInvariant("CachedBytesWithinCapacity", {
		description: "Cached bytes never exceed capacity; pre-positioning evicts",
	})
	.constrains(cachedAsset, capacityVO);

const resolveEdgeSchema = edgeBC.addSchema("ResolveEdge");
resolveEdgeSchema.addAttribute("clientIp", { type: "string" });
resolveEdgeSchema.addAttribute("renditionIds", {
	type: "string[]",
	identifies: rendition,
});

const assetPrepositioned = applianceAgg.provides("AssetPrepositioned", {
	description: "A rendition was pushed to an appliance ahead of demand",
	type: "event",
	internal: true,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const edgeApi = edgeBC.addService("EdgeAPI", {
	description:
		"Edge Delivery's application service: the boundary Playback resolves appliances through",
	type: "application",
});
// The answer comes back in the manifest format the kernel defines, so Edge
// fills in Playback's own StreamManifest rather than a shape of its own: that
// borrowing is what the shared kernel between the two contexts permits.
const edgeManifestSchema = edgeBC.addSchema("EdgeManifest", {
	description: "The appliance to fetch from, in the shared manifest format",
});
edgeManifestSchema.addAttribute("manifest", {
	type: "StreamManifest",
	valueobject: manifestVO,
});
const resolveEdge = edgeApi.provides("ResolveEdge", {
	description: "Which appliance a client should fetch from",
	type: "operation",
	pattern: "open-host-service",
	schema: resolveEdgeSchema,
	returns: edgeManifestSchema,
});
const prepositionAsset = applianceAgg
	.provides("PrepositionAsset", {
		description: "Push a rendition to appliances predicted to need it",
		type: "operation",
		internal: true,
	})
	.raises(assetPrepositioned);

edgeApi.consumes(encodingCompleted, { pattern: "conformist" });
edgeBC
	.addPolicy("Preposition on encode", {
		description:
			"New renditions are pushed to appliances by predicted popularity",
	})
	.on(encodingCompleted)
	.issues(prepositionAsset);

// Shared kernel: the manifest format is one library, so Playback takes the answer as it is.
playbackApi.consumes(resolveEdge, {
	pattern: "conformist",
	by: [startPlayback],
});

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
const capabilityVO = devicesBC.addValueObject("Capability", {
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
device.addAttribute("capability", {
	type: "Capability",
	valueobject: capabilityVO,
});
device.uses(capabilityVO, "capable-of", "1");
// `deviceModelId` on PlaybackSession and StartPlayback is declared here,
// because an attribute can only name a root that already exists and this is
// where the Device root is.
session.addAttribute("deviceModelId", {
	type: "string",
	description:
		"The partner model the unit is an instance of; what certification is checked against",
	identifies: device,
});
startPlaybackSchema.addAttribute("deviceModelId", {
	type: "string",
	identifies: device,
});
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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const devicesApi = devicesBC.addService("DevicesAPI", {
	description:
		"Devices' application service: the boundary manufacturers submit models through",
	type: "application",
});
devicesApi
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
// DISCOVERY: Playback engineering lead, "we don't start a session on a device
// that isn't certified against the current SDK". Playback keeps its own list of
// what is certified against which SDK, and `StartPlayback` reads that list to
// refuse an uncertified device. Keeping the list is the reaction; naming the
// operation that reads it named a thing that is issued rather than woken
// (`consumption-by-reactor`, card 98).
const recordCertifiedDevice = playbackApi.provides("RecordCertifiedDevice", {
	description:
		"Note a device model as certified against an SDK version, so a session may start on it",
	type: "operation",
	internal: true,
});
const keepCertifiedDevices = playbackBC
	.addPolicy("Keep the certified device list", {
		description:
			"Every certification joins the list StartPlayback checks before a session begins",
	})
	.on(deviceCertified)
	.issues(recordCertifiedDevice);
playbackApi.consumes(deviceCertified, {
	pattern: "conformist",
	by: [keepCertifiedDevices],
});

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
const affinityVO = recsBC.addValueObject("Affinity", {
	description: "A genre or theme and how strongly the profile leans to it",
});
affinityVO.addAttribute("genre", { type: "string" });
affinityVO.addAttribute("score", { type: "float 0..1" });
signal.addAttribute("signalId", { type: "string", identity: true });
signal.addAttribute("titleId", { type: "string", identifies: title });
signal.addAttribute("kind", {
	type: "'watched' | 'completed' | 'abandoned' | 'rated'",
});
signal.addAttribute("weight", { type: "float" });
signal.addAttribute("at", { type: "date-time" });
taste.includes(signal, "built-from", "*");
taste.addAttribute("affinities", {
	type: "Affinity[]",
	valueobject: affinityVO,
	optional: true,
	description:
		"What the profile leans to, strongest first; absent until it has watched something",
});
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

const openTasteProfile = tasteAgg.provides("OpenTasteProfile", {
	description:
		"Open the empty taste profile for a new member profile; signals arrive against it later",
	type: "operation",
	internal: true,
});
const recordSignal = tasteAgg.provides("RecordSignal", {
	description: "Add a viewing signal from a stopped session",
	type: "operation",
	internal: true,
});

// A returned shape: what RankRows and GetHomepageRows answer with.
const homepageRowSchema = recsBC.addSchema("HomepageRow", {
	description:
		"One ranked row: a title in a candidate pool the profile may see",
});
homepageRowSchema.addAttribute("titleId", {
	type: "string",
	identity: true,
	identifies: title,
});
const homepageRowsSchema = recsBC.addSchema("HomepageRows", {
	description: "The ranked rows for a profile",
});
homepageRowsSchema.addAttribute("rows", {
	type: "HomepageRow[]",
	schema: homepageRowSchema,
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
	returns: homepageRowsSchema,
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
	returns: homepageRowsSchema,
});

recsApi.consumes(playbackStopped, { pattern: "anti-corruption-layer" });
const addCandidateOnPublish = recsBC
	.addPolicy("Add candidate on publish", {
		description:
			"A published title joins the candidate pool; an availability change updates where it may be recommended",
	})
	.on(titlePublished, availabilityChanged)
	.issues(addCandidate);
// The two facts the candidate pool is built from. They came in at the Ranker
// until card 92: a domain service is the inside of the model, the same as an
// aggregate, so a foreign consumable is taken in at the application service and
// handed on (decision 17's amendment). What reacts to each is the policy above,
// and `by` says so, which is also what keeps the subscription backed.
recsApi.consumes(titlePublished, {
	pattern: "conformist",
	by: [addCandidateOnPublish],
});
recsApi.consumes(availabilityChanged, {
	pattern: "conformist",
	by: [addCandidateOnPublish],
});
// DELIBERATE (internal-consumable, twice): Personalisation reads the player's
// bookmark updates, which Playback declares internal, and reacts to them. The
// dependency was never agreed, and the model now says so at both ends: the
// consumption at the boundary and the reaction behind it. DISCOVERY: Head of
// Personalisation, "we also started reading the player's bookmark updates to
// make 'continue watching' fresher". The rows are built when they are asked
// for, so what the reaction does is keep the resume point where the ranker can
// find it; `GetHomepageRows` reads that. Naming the query as the subscriber
// named a thing that is issued rather than woken (`consumption-by-reactor`,
// card 98).
const recordResumePoint = recsApi.provides("RecordResumePoint", {
	description:
		"Keep a profile's latest resume point where the ranker can find it, so 'continue watching' is fresh when the rows are asked for",
	type: "operation",
	internal: true,
});
const freshenContinueWatching = recsBC
	.addPolicy("Freshen continue watching", {
		description:
			"A moved resume point updates what 'continue watching' will show next time the rows are built",
	})
	.on(bookmarkUpdated)
	.issues(recordResumePoint);
recsApi.consumes(bookmarkUpdated, {
	pattern: "anti-corruption-layer",
	by: [freshenContinueWatching],
});
recsBC
	.addPolicy("Record signal on stop", {
		description:
			"Every stopped session becomes a signal on the profile's taste",
	})
	.on(playbackStopped)
	.issues(recordSignal);

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
const maturityVO = householdsBC.addValueObject("MaturitySetting", {
	description: "The highest rating a profile may play",
});
maturityVO.addAttribute("maxRating", { type: "string" });
const pinVO = householdsBC.addValueObject("ProfilePin", {
	description: "Four digits that unlock a profile or raise a maturity cap",
});
pinVO.addAttribute("hash", { type: "string" });
household.addAttribute("householdId", { type: "string", identity: true });
// `accountId` is declared with the Account root further down.
household.addAttribute("country", { type: "ISO 3166 code" });
profile.addAttribute("profileId", { type: "string", identity: true });
// Every profile id in the model is declared here, because an attribute can
// only name an entity that already exists and this is where Profile is. A
// profile is a child of its household and stays one — entitlement and the
// stream limit are stated about the household — so what these hold is the
// child's id, reached through the Household root (decision 14, amended).
session.addAttribute("profileId", { type: "string", identifies: profile });
taste.addAttribute("profileId", {
	type: "string",
	identity: true,
	identifies: profile,
});
startPlaybackSchema.addAttribute("profileId", {
	type: "string",
	identifies: profile,
});
playbackStoppedSchema.addAttribute("profileId", {
	type: "string",
	identifies: profile,
});
// PlaybackSession's `householdId` and the invariant that reads it, and
// StartPlayback's own `householdId`, are declared here too, because the
// Household root they identify has to exist first.
const sessionHousehold = session.addAttribute("householdId", {
	type: "string",
	description:
		"The paying unit the profile belongs to; what entitlement is checked for",
	identifies: household,
});
// One session cannot see its siblings, so the limit is the context's rule and
// StartPlayback is where it is kept: GetEntitlement returns the plan's stream
// count and Playback counts the household's open sessions before it creates
// another (decision 27).
playbackBC
	.addInvariant("WithinStreamLimit", {
		description:
			"A session starts only if the household's open sessions are fewer than the plan's stream count from GetEntitlement; StartPlayback counts them, because a session cannot see its siblings",
	})
	.constrains(sessionHousehold, startPlayback);
startPlaybackSchema.addAttribute("householdId", {
	type: "string",
	identifies: household,
});
profile.addAttribute("name", { type: "string" });
profile.addAttribute("kids", { type: "boolean" });
profile.addAttribute("primary", { type: "boolean" });
household.includes(profile, "has-profiles", "1..*");
profile.addAttribute("maturity", {
	type: "MaturitySetting",
	valueobject: maturityVO,
});
profile.addAttribute("pin", {
	type: "ProfilePin",
	valueobject: pinVO,
	optional: true,
	description: "Absent on an unlocked profile",
});
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
// `accountId` is declared with the Account root further down.
householdCreatedSchema.addAttribute("country", { type: "ISO 3166 code" });
const profileCreatedSchema = householdsBC.addSchema("ProfileCreated");
profileCreatedSchema.addAttribute("profileId", {
	type: "string",
	identity: true,
	identifies: profile,
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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const profilesApi = householdsBC.addService("ProfilesAPI", {
	description:
		"Households & Profiles' application service: the boundary members manage profiles through",
	type: "application",
});
profilesApi
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

// DISCOVERY: Head of Personalisation, "every profile has a taste profile", and
// the wall's "Recommendations creates taste profile" against `ProfileCreated`.
// The reaction was on the wall and never in the model, so the consumption stood
// on its own (`subscription-backed`, card 92). It is written here because the
// event is declared in this section.
const openOnProfileCreated = recsBC
	.addPolicy("Open a taste profile on profile created", {
		description:
			"A new profile gets an empty taste profile, so its first signal has somewhere to go",
	})
	.on(profileCreated)
	.issues(openTasteProfile);
recsApi.consumes(profileCreated, {
	pattern: "conformist",
	by: [openOnProfileCreated],
});

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
const planVO = billingBC.addValueObject("Plan", {
	description: "A tier: price, concurrent streams, ad-supported or not",
});
const planMoney = money(billingBC);
planVO.addAttribute("tier", {
	type: "'basic-with-ads' | 'standard' | 'premium'",
});
planVO.addAttribute("price", { type: "Money", valueobject: planMoney });
planVO.addAttribute("maxStreams", { type: "int" });
planVO.addAttribute("adSupported", { type: "boolean" });
const periodVO = billingBC.addValueObject("BillingPeriod", {
	description: "The month an invoice covers",
});
periodVO.addAttribute("from", { type: "date" });
periodVO.addAttribute("to", { type: "date" });
subscription.addAttribute("subscriptionId", { type: "string", identity: true });
const subscriptionHousehold = subscription.addAttribute("householdId", {
	type: "string",
	identifies: household,
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
planVO.uses(planMoney, "priced-at", "1");
subscription.uses(planVO, "on-plan", "1");
invoice.addAttribute("period", {
	type: "BillingPeriod",
	valueobject: periodVO,
});
invoice.uses(periodVO, "covers", "1");
invoice.uses(planMoney, "charges", "1");

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
subscriptionSchema.addAttribute("householdId", {
	type: "string",
	identifies: household,
});
const entitlementSchema = billingBC.addSchema("EntitlementRequest", {
	description: "What Playback asks: which household, for how many streams",
});
entitlementSchema.addAttribute("householdId", {
	type: "string",
	identifies: household,
});
// A returned shape: what GetEntitlement answers with.
const entitlementResultSchema = billingBC.addSchema("Entitlement", {
	description: "Whether the household may stream, and how many at once",
});
entitlementResultSchema.addAttribute("entitled", { type: "boolean" });
entitlementResultSchema.addAttribute("maxConcurrentStreams", { type: "int" });

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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const billingApi = billingBC.addService("BillingAPI", {
	description:
		"Billing & Plans' application service: the boundary plans are bought and entitlement is read through",
	type: "application",
});
const startSubscription = billingApi
	.provides("StartSubscription", {
		description: "Put a household on a plan",
		type: "operation",
		pattern: "open-host-service",
		schema: subscriptionSchema,
	})
	.raises(subscriptionActivated);
// One Subscription cannot see its siblings, so the rule belongs to the context
// and names the operation that keeps it: StartSubscription refuses a household
// that already has an active one, keyed on householdId (decision 27).
billingBC
	.addInvariant("OneActiveSubscriptionPerHousehold", {
		description:
			"A household has at most one active subscription; StartSubscription refuses a second on householdId, since one subscription cannot see another",
	})
	.constrains(subscriptionHousehold, startSubscription);
const getEntitlement = billingApi.provides("GetEntitlement", {
	description: "Whether a household may stream, and how many at once",
	type: "operation",
	pattern: "open-host-service",
	schema: entitlementSchema,
	returns: entitlementResultSchema,
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
const awaitPlan = billingBC
	.addPolicy("Await plan on household", {
		description:
			"A new household is registered in billing until it picks a plan",
	})
	.on(householdCreated)
	.issues(registerHousehold);
// Nothing in billing reads Identity's event except this reaction; renewing,
// dunning and answering entitlement never touch it.
billingApi.consumes(householdCreated, {
	pattern: "conformist",
	by: [awaitPlan],
});
billingBC
	.addPolicy("Dun on failed payment", {
		description:
			"A failed renewal starts the grace period, not an immediate lapse",
	})
	.on(paymentFailed)
	.issues(startDunning);

// Playback asks billing before every start, translating the answer to its own yes/no.
playbackApi.consumes(getEntitlement, {
	pattern: "anti-corruption-layer",
	by: [startPlayback],
});

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
// `accountId` on Household and HouseholdCreated is declared here, because an
// attribute can only name a root that already exists and this is where the
// Account root is.
household.addAttribute("accountId", { type: "string", identifies: account });
householdCreatedSchema.addAttribute("accountId", {
	type: "string",
	identifies: account,
});
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

profilesApi.consumes(accountCreated, { pattern: "conformist" });
householdsBC
	.addPolicy("Create household on account", {
		description: "Every new account gets a household and a primary profile",
	})
	.on(accountCreated)
	.issues(createHousehold);

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
const advertiserVO = adsBC.addValueObject("Advertiser", {
	description: "Who paid for the creative",
});
advertiserVO.addAttribute("name", { type: "string" });
const frequencyCapVO = adsBC.addValueObject("FrequencyCap", {
	description:
		"The creative's rule for how often one household may see it in a day. The break carries the rule; PrepareBreaks applies it against the household's impressions so far today, which a single break cannot hold",
});
frequencyCapVO.addAttribute("maxPerDay", { type: "int" });
adBreak.addAttribute("breakId", { type: "string", identity: true });
adBreak.addAttribute("sessionId", { type: "string", identifies: session });
// DISCOVERY: Ads Team lead ("we work with plan and country"), peer review.
// The plan is what the ad-supported rule reads, so the break records it.
adBreak.addAttribute("householdId", {
	type: "string",
	identifies: household,
});
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
adSlot.addAttribute("advertiser", {
	type: "Advertiser",
	valueobject: advertiserVO,
});
adSlot.addAttribute("frequencyCap", {
	type: "FrequencyCap",
	valueobject: frequencyCapVO,
});
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
// `AdsOnlyOnAdSupportedPlan` is declared further down, with PrepareBreaks: the
// tier is checked before any break exists, and PrepareBreaks is the operation
// that checks it, so the guard is named rather than described (decision 19).

const resolveBreakSchema = adsBC.addSchema("ResolveAdBreak");
resolveBreakSchema.addAttribute("sessionId", { type: "string" });
resolveBreakSchema.addAttribute("positionSeconds", { type: "int" });
// A returned shape: what ResolveAdBreak answers with.
const adSlotSchema = adsBC.addSchema("AdSlot", {
	description: "One slot in the break, with the creative to show",
});
adSlotSchema.addAttribute("creativeId", { type: "string", identity: true });
adSlotSchema.addAttribute("durationSeconds", { type: "int" });
const adBreakResultSchema = adsBC.addSchema("AdBreakSlots", {
	description: "The slots for the break the player has reached",
});
adBreakResultSchema.addAttribute("slots", {
	type: "AdSlot[]",
	schema: adSlotSchema,
});
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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const adsApi = adsBC.addService("AdsAPI", {
	description:
		"Ads Tier's application service: the boundary Playback resolves breaks through",
	type: "application",
});
const resolveAdBreak = adsApi.provides("ResolveAdBreak", {
	description: "The slots for a break the player has reached",
	type: "operation",
	pattern: "open-host-service",
	schema: resolveBreakSchema,
	returns: adBreakResultSchema,
});
const prepareBreaks = breakAgg.provides("PrepareBreaks", {
	description:
		"Plan the breaks for a session by plan and country: ask billing for the household's plan, skip if it is not ad-supported, and fill slots within each creative's daily cap",
	type: "operation",
	internal: true,
});
// The precondition on that plan: a rule about one break, checked at the moment
// the breaks are planned, so it names the operation that plans them.
breakAgg
	.addInvariant("AdsOnlyOnAdSupportedPlan", {
		description:
			"Breaks exist only for sessions whose planTier is ad-supported; the tier comes from billing's entitlement answer, which PrepareBreaks reads before it plans anything",
		// The tier is another context's to change, so the check holds at the
		// moment PrepareBreaks reads it and not afterwards (card 94).
		precondition: true,
	})
	.constrains(breakPlanTier, prepareBreaks);
breakAgg
	.provides("RecordImpression", {
		description: "The player confirmed a creative played",
		type: "operation",
		internal: true,
	})
	.raises(impressionRecorded);

adsApi.consumes(playbackStarted, { pattern: "anti-corruption-layer" });
// The plan is billing's fact; Ads asks for it the same way Playback does.
adsApi.consumes(getEntitlement, {
	pattern: "anti-corruption-layer",
	by: [resolveAdBreak],
});
adsBC
	.addPolicy("Prepare breaks on start", {
		description:
			"Breaks are planned when the session starts, before the first one is reached",
	})
	.on(playbackStarted)
	.issues(prepareBreaks);
playbackApi.consumes(resolveAdBreak, {
	pattern: "anti-corruption-layer",
	by: [startPlayback],
});

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

// DISCOVERY: Legacy Operations, "a monthly export of charges to billing".
// Card 81 gave that a MonthlyExport service with a RunMonthlyExport operation
// so the event had a raiser, and it was already labelled "the one job anyone
// will describe": the rest of the monolith is unreadable, which is what
// bigBallOfMud says. Such a context may say what it emits without saying how,
// and `event-unraised` no longer asks it to (decision 28, second amendment;
// card 90). The service and its operation are gone; the export still arrives
// each month.

const addDiscCharge = billingBC
	.addPolicy("Add disc charge to bill", {
		description:
			"The legacy export is translated into an invoice line on the household",
	})
	.on(discRentalInvoiced)
	.issues(addInvoiceLine);
// The monthly export reaches billing through this one reaction; the rest of
// the subscription lifecycle knows nothing about discs.
billingApi.consumes(discRentalInvoiced, {
	pattern: "anti-corruption-layer",
	by: [addDiscCharge],
});

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

// Five identity-only relationships used to sit here: Licensing on Catalogue,
// Encoding on Catalogue, Playback on Households & Profiles, Playback on
// Encoding, and Ads Tier on Households & Profiles. Each pair was joined by
// nothing but an identity attribute naming the other context's entity, so
// neither end played a role, both lists were empty, and the description said
// in words that nothing is exchanged. That is a shape DDD does not have, and
// the model already had the record it needed: the context map draws an
// identity crossing as an implied «id» edge. `relationship-declared` no longer
// asks for a relationship on top of one (decision 14's amendment of
// 2026-09-09; card 100). The dependencies stay and read on the map, from the
// attributes that hold them.

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
// One release train and a joint lab run; the only traffic is Playback
// consuming DeviceCertified, and Devices consumes nothing of Playback's. That
// is fine: Evans's partnership is two teams whose success is mutual and whose
// releases are planned as one, which is exactly what the player and the SDK
// have, and it does not require traffic both ways (decision 20's second
// amendment). This used to raise partnership-backed; card 69 relaxed the rule
// and it is no longer a finding. See DISCOVERY.md section 7.
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
