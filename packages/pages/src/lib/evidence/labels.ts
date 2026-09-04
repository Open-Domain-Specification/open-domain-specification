import type {
	CommentLinkKind,
	ContextRelationship,
	Disposition,
} from "@open-domain-specification/core";
import { PATTERNS } from "@open-domain-specification/core";

/**
 * How the evidence layer is worded. The schema is core's — comments and one
 * disposition per intent, with no lifecycle — and what a reader sees next to
 * it is a pages concern, so the labels and the tooltip lines live here.
 */

/** What each disposition claims, for the chip's tooltip. */
export const DISPOSITION_SUMMARIES: Record<Disposition, string> = {
	"by-design": "This is how the architecture should be.",
	tolerated: "A known compromise, not planned to change. The comments say why.",
	refactor:
		"Should be removed or replaced. The comments say what it should become.",
};

/** Human wording for a disposition chip. */
export const DISPOSITION_LABELS: Record<Disposition, string> = {
	"by-design": "by design",
	tolerated: "tolerated",
	refactor: "refactor",
};

/**
 * The one line a map badge discloses on hover: what the relationship's pattern
 * means, then the first thing anyone wrote down about it. Saying so when
 * nothing has been written is the point — an unexplained intent is the reader's
 * cue that the map is a claim nobody has checked.
 */
export const intentSummary = (r: ContextRelationship): string =>
	[
		PATTERNS[r.type].summary,
		r.comments[0]?.text ?? "No comments recorded yet.",
	].join(" ");

/** How a comment's link kind is worded next to the statement. */
export const LINK_KIND_LABELS: Record<CommentLinkKind, string> = {
	code: "code",
	contract: "contract",
	adr: "decision",
	runbook: "runbook",
	dashboard: "dashboard",
};
