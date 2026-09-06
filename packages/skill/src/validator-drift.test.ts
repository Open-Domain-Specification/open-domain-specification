/**
 * The skill and the docs make claims about what the validator does. The
 * architect's thirteenth round found six of those claims stale against
 * `packages/core/src/validate.ts` (card 129). This test pins the corrected
 * wording by asserting the six old, contradicted sentences never come back,
 * in any hand-written file that could restate them.
 *
 * The architect's fourteenth round (card 131) found two more: one written
 * into `generate.mts`'s own template, which regenerates the model reference,
 * and one in the interview playbook. Both files are checked directly.
 *
 * Whitespace is collapsed before matching so a sentence rewrapped across
 * lines by an editor still matches the exact words it once read.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { packageRoot } from "../scripts/generate.mts";

const repoRoot = join(packageRoot, "..", "..");

const normalise = (text: string) => text.replace(/\s+/g, " ");

const handWrittenFiles = [
	"packages/skill/skill/SKILL.md",
	"packages/skill/skill/references/interview-playbook.md",
	"packages/skill/skill/references/preferences.md",
	"packages/skill/skill/references/json-mode.md",
	"apps/docs/docs/3-core/2-strategic-design.md",
	"apps/docs/docs/3-core/3-tactical-design.md",
	"packages/core/src/schema.ts",
	// Not hand-authored prose, but a template that writes prose: the string
	// literal in generate.mts is the source the generated model reference is
	// rebuilt from, so a stale sentence there regenerates itself right back.
	"packages/skill/scripts/generate.mts",
	// The generated file itself, committed at the repo root, so a drift
	// between the template and what is actually checked in is also caught.
	"packages/skill/skill/references/model-reference.md",
].map((path) => ({ path, text: normalise(readFileSync(join(repoRoot, path), "utf8")) }));

const corpus = handWrittenFiles.map((f) => f.text).join("\n");

/**
 * Each entry is one of the architect's six claims. Several were repeated,
 * worded slightly differently, in more than one file; every wording found is
 * listed so the drift cannot silently return through any of them.
 */
const oldClaims: Array<{ claim: string; sentences: string[] }> = [
	{
		claim: "a dangling ref stops the whole file loading (decision 29: it loads and reports unresolved-ref)",
		sentences: [
			"A dangling ref is a load failure, not a warning: the whole file stops loading.",
			'If loading throws "... with ref ... not found", a ref is dangling: fix it first.',
		],
	},
	{
		claim: "a value object or schema crosses only over a shared kernel (decision 16: a conformist borrows too)",
		sentences: [
			"A value object or a schema may be named across a boundary only where the two contexts declare a `shared-kernel` relationship.",
			"If a value is genuinely the same in a neighbouring context, that is a `shared-kernel` relationship, and it is the only way one context may name another's value object.",
			"Two contexts may share one only across a `shared-kernel` relationship.",
		],
	},
	{
		claim: "a specialisation parent borrows only over a shared kernel (decision 22: a conformist borrows too)",
		sentences: [
			"a value object is a kind of one its own context declares or borrows over a `shared-kernel`.",
			"The target belongs to this context, or to a context this one shares a kernel with (decision 22).",
		],
	},
	{
		claim: "an answer routes one hop through a front (card 126: it follows the local `by` chain and stops at the boundary)",
		sentences: [
			"An answer routes one hop. An operation's answer reaches the reactor that issued it and nobody further, so a process whose front makes the call does not hear the neighbour's reply through that front; the chain has to be written where the reader can follow it.",
		],
	},
	{
		claim: "relationship-declared warns on an identity crossing until a relationship is declared (decision 14: it does not)",
		sentences: [
			"Declaring a relationship replaces the implied edge, and `relationship-declared` warns until one is.",
		],
	},
	{
		claim: "a reference targets the root only (cross-aggregate-reference also accepts a kind of the root)",
		sentences: ["Reference another aggregate only through its root entity, with `references`."],
	},
	{
		claim: "a dangling ref makes the whole file fail to load (decision 29: it loads and reports unresolved-ref)",
		sentences: ["A ref that points at nothing makes the whole file fail to load."],
	},
	{
		claim: "an invariant's guard is only an operation of the same aggregate (decision 19: any service of the context may guard)",
		sentences: [
			"Only an operation of the same aggregate; if the user names the API endpoint, the aggregate's own operation behind it is the one to name.",
		],
	},
	{
		claim:
			"leaving `by` off is fine for a consumer that provides one operation or none (decision 21's second amendment of 2026-09-10: a zero-operation consumer is reported)",
		sentences: [
			"which is fine where the consumer provides one operation or none, because there is nothing to choose between",
			"Absent means the whole consumer, which is fine for a consumer that provides one operation, or none, because there is nothing to choose between.",
		],
	},
	{
		claim: "a policy's consumables may belong to other contexts as long as they are not internal (policy-in-context refuses any foreign operation)",
		sentences: ["The consumables may belong to other contexts as long as they are not internal."],
	},
	{
		claim: "a specialisation's value object parent borrows only over a shared kernel or as a conformist (decision 16's second amendment of 2026-09-10: a customer-supplier downstream borrows too)",
		sentences: [
			"The target belongs to this context, or to a context this one borrows from — over a shared kernel or as a conformist (decision 22).",
			"one it borrows through a shared kernel or as a conformist of the context that owns it.",
			"its own context declares, or one it borrows over a `shared-kernel` or as a conformist of the context that owns it.",
		],
	},
	{
		claim: "the specialisation example cites NorthBank current, savings and loan accounts (the model carries customer and nominal ledger accounts)",
		sentences: [
			"NorthBank's current, savings and loan accounts, or StreamLine's films and series, are kinds of one account or one title",
		],
	},
	{
		claim: "every required collection is present even when empty (card 104: an absent collection is an empty one)",
		sentences: ["Every required collection is present even when empty."],
	},
];

describe("validator drift", () => {
	for (const { claim, sentences } of oldClaims) {
		for (const sentence of sentences) {
			it(`never restates: ${claim} — "${sentence.slice(0, 60)}..."`, () => {
				expect(corpus).not.toContain(normalise(sentence));
			});
		}
	}
});
