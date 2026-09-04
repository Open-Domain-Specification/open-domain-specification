<script lang="ts">
import type { Comment } from "@open-domain-specification/core";
import Comments from "./Comments.svelte";

/** The comments on one relationship; `dense` shows a long sheet, `empty` the sentence with nothing written. */
const { dense = false, empty = false }: { dense?: boolean; empty?: boolean } =
	$props();

const sheet: Comment[] = [
	{
		text: "PetStatus and its values live in @petstore/kernel and both services compile against it.",
		link: {
			kind: "code",
			url: "https://example.com/kernel/PetStatus.ts",
			label: "packages/kernel/src/PetStatus.ts",
		},
	},
	{
		text: "The kernel has grown past the status enum and now carries pricing rules; it should become a Published Language from Catalog.",
		link: {
			kind: "adr",
			url: "https://example.com/adr/14",
			label: "ADR-014 Shrink the kernel",
		},
	},
	{ text: "Nobody has written down why the rounding rules moved." },
	{
		text: "The contract is versioned; v2 is the one both sides build against.",
		link: {
			kind: "contract",
			url: "https://example.com/contracts/pet-status/v2",
		},
	},
];
const long: Comment[] = [
	...sheet,
	{
		text: "Restarts are documented; the projection replays from the last checkpoint.",
		link: {
			kind: "runbook",
			url: "https://example.com/runbooks/projection",
			label: "projection replay",
		},
	},
	{
		text: "Lag is on the shared board, usually under a minute.",
		link: {
			kind: "dashboard",
			url: "https://example.com/grafana/lag",
			label: "projection lag",
		},
	},
	{ text: "The translator has one test per upstream event shape." },
	{
		text: "Two consumers still read the v1 contract; both are scheduled to move this quarter.",
		link: {
			kind: "code",
			url: "https://example.com/search?q=v1",
			label: "v1 readers",
		},
	},
];
const comments = $derived(empty ? [] : dense ? long : sheet);
</script>

<Comments {comments} empty="No comments recorded for this relationship yet." />
