<script module lang="ts">
import type { Comment, Evidenced } from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import PatternHover from "./PatternHover.svelte";

/**
 * The keyword hover in the four states a reader meets it in: a pattern with
 * nothing recorded against it, one with comments, one the architecture
 * tolerates and one it wants gone — each in light, dark and high contrast,
 * because the card is the editor's hover widget and those are the three sets
 * of hover tokens. Hover or focus a keyword to open it; a click pins it,
 * Escape closes it.
 */

const comment = (text: string, label?: string): Comment =>
	label
		? {
				text,
				link: { kind: "code", url: `https://example.com/${label}`, label },
			}
		: { text };

const NONE: Evidenced = { comments: [] };
const COMMENTED: Evidenced = {
	comments: [
		comment(
			"PetSummaryClient is the translator; nothing else in Sales knows the catalog payload shape.",
			"sales/acl/PetSummaryClient.ts",
		),
		comment("The mapping is regenerated from the published contract."),
	],
};
const TOLERATED: Evidenced = {
	comments: [comment("Reporting is read-only, so conforming is cheap.")],
	disposition: "tolerated",
};
const REFACTOR: Evidenced = {
	comments: [
		comment(
			"The translator duplicates Identity's token parsing.",
			"sales/acl/Tokens.ts",
		),
	],
	disposition: "refactor",
};

/**
 * A card only exists once something opens it, so each story focuses its
 * Anti-Corruption Layer keyword: the design is the open card, not the word.
 */
const openAcl = ({ canvasElement }: { canvasElement: HTMLElement }) => {
	// Found by the word, not by its place in the row: reordering the row must
	// not silently change which card a story shows.
	[...canvasElement.querySelectorAll(".pattern-hover")]
		.find((term) => term.textContent?.trim() === "ACL")
		?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
};

const { Story } = defineMeta({
	title: "Molecules/PatternHover",
	component: PatternHover,
	parameters: { layout: "padded" },
	play: openAcl,
});
</script>

<!-- The row a strategic position table draws: the type spelled out, then the
     two role codes in the editor font. -->
{#snippet row(intent: Evidenced)}
	<p style="padding-bottom: 240px">
		<PatternHover pattern="customer-supplier" label="customer-supplier" {intent} />
		<PatternHover pattern="open-host-service" mono {intent} />
		<PatternHover pattern="anti-corruption-layer" mono {intent} />
	</p>
{/snippet}

{#snippet themed(mode: "light" | "dark" | "hc", intent: Evidenced)}
	<Theme {mode}>{@render row(intent)}</Theme>
{/snippet}

<!-- The keyword still teaches itself when the relationship says nothing. -->
<Story name="No comments, light">{#snippet template()}{@render themed("light", NONE)}{/snippet}</Story>
<Story name="No comments, dark">{#snippet template()}{@render themed("dark", NONE)}{/snippet}</Story>
<Story name="No comments, high contrast">{#snippet template()}{@render themed("hc", NONE)}{/snippet}</Story>

<Story name="Comments, light">{#snippet template()}{@render themed("light", COMMENTED)}{/snippet}</Story>
<Story name="Comments, dark">{#snippet template()}{@render themed("dark", COMMENTED)}{/snippet}</Story>
<Story name="Comments, high contrast">{#snippet template()}{@render themed("hc", COMMENTED)}{/snippet}</Story>

<Story name="Tolerated, light">{#snippet template()}{@render themed("light", TOLERATED)}{/snippet}</Story>
<Story name="Tolerated, dark">{#snippet template()}{@render themed("dark", TOLERATED)}{/snippet}</Story>
<Story name="Tolerated, high contrast">{#snippet template()}{@render themed("hc", TOLERATED)}{/snippet}</Story>

<Story name="Refactor, light">{#snippet template()}{@render themed("light", REFACTOR)}{/snippet}</Story>
<Story name="Refactor, dark">{#snippet template()}{@render themed("dark", REFACTOR)}{/snippet}</Story>
<Story name="Refactor, high contrast">{#snippet template()}{@render themed("hc", REFACTOR)}{/snippet}</Story>
