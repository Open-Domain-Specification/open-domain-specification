<script module lang="ts">
import type { Comment, Evidenced } from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../evidence/Theme.harness.svelte";
import PatternHoverCard from "./PatternHoverCard.svelte";

/**
 * The keyword hover in the four states a reader meets it in: a pattern with
 * nothing recorded against it, one with comments, one the architecture
 * tolerates and one it wants gone. Hover or focus a chip to open the card;
 * click pins it, Escape closes it.
 */

const comment = (text: string, label?: string): Comment =>
	label
		? {
				text,
				link: {
					kind: "code",
					url: `https://example.com/${label}`,
					label,
				},
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
 * Anti-Corruption Layer chip: the design is the open card, not the chip.
 */
const open = ({ canvasElement }: { canvasElement: HTMLElement }) => {
	canvasElement
		.querySelectorAll("button.chip")[2]
		?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
};

const { Story } = defineMeta({
	title: "Molecules/PatternHoverCard",
	component: PatternHoverCard,
	parameters: { layout: "padded" },
	play: open,
});
</script>

{#snippet row(intent: Evidenced | undefined)}
	<p style="padding-bottom: 220px">
		<PatternHoverCard pattern="customer-supplier" label="customer-supplier" {intent} />
		<PatternHoverCard pattern="open-host-service" {intent} />
		<PatternHoverCard pattern="anti-corruption-layer" {intent} />
	</p>
{/snippet}

<!-- The keyword still teaches itself when the relationship says nothing. -->
<Story name="No comments">{#snippet template()}{@render row(NONE)}{/snippet}</Story>

<Story name="Comments">{#snippet template()}{@render row(COMMENTED)}{/snippet}</Story>

<Story name="Tolerated">{#snippet template()}{@render row(TOLERATED)}{/snippet}</Story>

<Story name="Refactor">{#snippet template()}{@render row(REFACTOR)}{/snippet}</Story>

<Story name="Refactor, light">
	{#snippet template()}
		<Theme mode="light">{@render row(REFACTOR)}</Theme>
	{/snippet}
</Story>

<Story name="Refactor, dark">
	{#snippet template()}
		<Theme mode="dark">{@render row(REFACTOR)}</Theme>
	{/snippet}
</Story>
