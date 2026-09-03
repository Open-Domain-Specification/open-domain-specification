import { PATTERNS } from "./patterns";
import { isSymmetricRelationship } from "./relationship";
import type { DownstreamRole, UpstreamRole } from "./schema";
import type { ContextRelationship } from "./workspace";

/**
 * One templated sentence describing a relationship from the point of view of
 * one of its two contexts (RFC-001 section 5).
 *
 * The words are fixed here so every surface says the same thing: the pages
 * strategic position table, the generated documentation and the authoring
 * skill all read this rather than each writing prose of their own. The result
 * is a list of segments rather than a string so a renderer can draw a context
 * as a link and a pattern as a hoverable term; {@link narrativeText} flattens
 * it for a tooltip or a markdown cell.
 *
 * A leaf module, like `relationship.ts`: everything above it reads it.
 */

/** A pattern the sentence can name: a relationship type or either side's role. */
export type PatternKey = keyof typeof PATTERNS;

/** A named context in the sentence, so a renderer can link or pill it. */
export type NarrativeContext = { ref: string; name: string };

export type NarrativeSegment =
	| { kind: "text"; text: string }
	| { kind: "context"; ref: string; name: string }
	| { kind: "pattern"; pattern: PatternKey };

/**
 * What the sentence is generated from. A {@link ContextRelationship} satisfies
 * it; `implied` is the decision-03 link derived from consumptions rather than
 * declared, which no model element carries and only a map edge knows about.
 */
export type NarratableRelationship = Pick<
	ContextRelationship,
	"type" | "upstreamRoles" | "downstreamRoles"
> & {
	source: NarrativeContext;
	target: NarrativeContext;
	/** True when the link was derived from consumptions rather than declared. */
	implied?: boolean;
};

const text = (value: string): NarrativeSegment => ({
	kind: "text",
	text: value,
});
const context = (c: NarrativeContext): NarrativeSegment => ({
	kind: "context",
	ref: c.ref,
	name: c.name,
});
const pattern = (key: PatternKey): NarrativeSegment => ({
	kind: "pattern",
	pattern: key,
});

/**
 * Segments are assembled from small pieces, so neighbouring literals would
 * otherwise arrive as several segments a renderer has to stitch back
 * together. Collapsing them keeps one text run per gap between terms.
 */
function merge(segments: NarrativeSegment[]): NarrativeSegment[] {
	const merged: NarrativeSegment[] = [];
	for (const segment of segments) {
		const last = merged[merged.length - 1];
		if (segment.kind === "text" && last?.kind === "text")
			merged[merged.length - 1] = text(last.text + segment.text);
		else merged.push(segment);
	}
	return merged;
}

/** Both upstream roles read as a noun phrase; only these two exist. */
const ARTICLE: Record<UpstreamRole, string> = {
	"open-host-service": "an",
	"published-language": "a",
};

/** `an Open Host Service and a Published Language`, in the order declared. */
const exposing = (roles: UpstreamRole[]): NarrativeSegment[] =>
	roles.flatMap((role, i) => [
		...(i ? [text(" and ")] : []),
		text(`${ARTICLE[role]} `),
		pattern(role),
	]);

/**
 * The same roles after "consuming its", where the possessive already
 * determines the article: "consuming its Open Host Service".
 */
const consuming = (roles: UpstreamRole[]): NarrativeSegment[] =>
	roles.flatMap((role, i) => [...(i ? [text(" and ")] : []), pattern(role)]);

/**
 * What the downstream side does with the upstream model. Both roles at once is
 * its own sentence rather than a join of the two, and no role at all is still
 * a clause: taking the model as it comes is a position, not a blank.
 */
function protecting(
	subject: NarrativeSegment[],
	roles: DownstreamRole[],
): NarrativeSegment[] {
	const acl = roles.includes("anti-corruption-layer");
	const conformist = roles.includes("conformist");
	if (acl && conformist)
		return [
			...subject,
			text(" conforms to the upstream model and protects the rest with an "),
			pattern("anti-corruption-layer"),
		];
	if (acl)
		return [
			...subject,
			text(" protects its model with an "),
			pattern("anti-corruption-layer"),
		];
	if (conformist)
		return [...subject, text(" conforms directly to the upstream model")];
	return [...subject, text(" takes the upstream model as it comes")];
}

/** Rule 1's verb: only a customer/supplier relationship carries a commitment. */
const UPSTREAM_VERB = {
	"customer-supplier": "acts as an upstream supplier to",
	"upstream-downstream": "is upstream of",
} as const;

/** Rule 3: neither side leads, so one template covers the whole sentence. */
const SYMMETRIC = {
	"shared-kernel": [
		" shares a ",
		"; changes to it need both teams' agreement.",
	],
	partnership: [" is in a ", "; the two plan, build and release together."],
	"separate-ways": [
		" has gone ",
		"; there is no technical integration between them.",
	],
} as const;

const SYMMETRIC_JOIN = {
	"shared-kernel": " with ",
	partnership: " with ",
	"separate-ways": " from ",
} as const;

/** Rule 5: the aside every implied link carries, in the context page's words. */
const IMPLIED_ASIDE =
	" Implied by consumptions; no explicit relationship is declared.";

/**
 * The sentence for `r` as read from `viewpoint`, one of its two contexts.
 *
 * The viewpoint is always the subject, so the same relationship reads as
 * "supplies" from one end and "depends on" from the other. A viewpoint that is
 * not the upstream end is treated as the downstream one, which is what every
 * caller means: the table and the doc generator only ever pass a participant.
 */
export function relationshipNarrative(
	r: NarratableRelationship,
	viewpoint: NarrativeContext,
): NarrativeSegment[] {
	const upstream = r.source;
	const isUpstream = viewpoint.ref === upstream.ref;
	const other = isUpstream ? r.target : upstream;

	if (isSymmetricRelationship(r.type)) {
		const type = r.type as keyof typeof SYMMETRIC;
		const [verb, tail] = SYMMETRIC[type];
		return merge([
			context(viewpoint),
			text(verb),
			pattern(type),
			text(SYMMETRIC_JOIN[type]),
			context(other),
			text(tail),
		]);
	}

	// An implied link is an undeclared dependency: the plain directed template
	// with nothing on either side, and an aside saying where it came from.
	const upstreamRoles = r.implied ? [] : r.upstreamRoles;
	const downstreamRoles = r.implied ? [] : r.downstreamRoles;
	const aside = r.implied ? [text(IMPLIED_ASIDE)] : [];
	const type = r.implied
		? "upstream-downstream"
		: (r.type as keyof typeof UPSTREAM_VERB);

	if (isUpstream)
		return merge([
			context(viewpoint),
			text(` ${UPSTREAM_VERB[type]} `),
			context(other),
			...(upstreamRoles.length
				? [text(", exposing "), ...exposing(upstreamRoles)]
				: []),
			text(", while "),
			...protecting([context(other)], downstreamRoles),
			text("."),
			...aside,
		]);

	return merge([
		context(viewpoint),
		text(" depends on "),
		context(other),
		...(type === "customer-supplier" ? [text(" as a customer")] : []),
		...(upstreamRoles.length
			? [text(", consuming its "), ...consuming(upstreamRoles)]
			: []),
		text(", and "),
		...protecting([text("it")], downstreamRoles),
		text("."),
		...aside,
	]);
}

/** The sentence as plain prose, for a tooltip, a markdown cell or the skill. */
export const narrativeText = (segments: NarrativeSegment[]): string =>
	segments
		.map((s) =>
			s.kind === "text"
				? s.text
				: s.kind === "context"
					? s.name
					: PATTERNS[s.pattern].name,
		)
		.join("");
