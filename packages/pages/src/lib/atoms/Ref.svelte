<script lang="ts">
import { localRoute, maybeModel } from "../model";
import { modelRefToHash } from "../ref-transport";
import { routeOf } from "../route";
import { iconColor, type Kind } from "./kinds";

/**
 * A link. A model ref is encoded as the URL fragment while `data-ref` keeps
 * the canonical model identity for hosts; `external` marks a link that leaves the model, which gets the
 * trailing codicon VS Code puts after external links in Settings and release
 * notes. The look is the platform's: link colour, no underline until hover,
 * the focus ring in `focusBorder`. An icon, when given, takes the kind's
 * symbol colour rather than the link colour so the glyph reads as a kind
 * mark and the text as the link.
 *
 * `ref` is either an element, which links to the page of the exact file that
 * owns it, or a string: a route, or a ref of the workspace on screen. Inside a
 * set of more than one file that string is read in the file on screen, so a
 * ref to something that may live in another file is always passed as the
 * element itself.
 *
 * With an icon the link is a lockup, and a lockup never breaks inside itself
 * (design language, principle 6): a narrow table cell may wrap between it and
 * what follows, never between the icon and the name (#85).
 */
const {
	ref,
	label,
	icon,
	kind,
	external = false,
	title,
	current,
	prose = false,
}: {
	ref: string | { ref: string };
	label: string;
	icon?: string;
	kind?: Kind;
	external?: boolean;
	title?: string;
	/** `aria-current="page"` for the one link to the page being read. */
	current?: "page";
	/**
	 * The link ends or sits inside a sentence, so colour alone must not be the
	 * only thing that marks it (#79): it is underlined at rest. A link that is
	 * a list item, a cell or navigation is a standalone control and leaves this off.
	 */
	prose?: boolean;
} = $props();
const model = maybeModel();
const route = $derived(
	external
		? (ref as string)
		: typeof ref === "string"
			? localRoute(model, ref)
			: routeOf(ref),
);
</script>

<a
	class="ref"
	class:prose
	href={external ? route : modelRefToHash(route)}
	data-ref={external ? undefined : route}
	rel={external ? "external noreferrer" : undefined}
	{title}
	aria-current={current}
>{#if icon}<span class="ref-lockup"><i class={`codicon codicon-${icon}`} style:color={iconColor(kind)} aria-hidden="true"></i>{label}</span>{:else}{label}{/if}{#if external}<i class="codicon codicon-link-external" aria-hidden="true"></i>{/if}</a>

<style>
	.ref {
		color: var(--vscode-textLink-foreground);
		text-decoration: none;
		border-radius: 2px;
	}
	/* Inside the link rather than on it, so a separator a list draws on the
	   link itself (`Joined`'s comma) is still somewhere a cell can wrap. */
	.ref-lockup {
		white-space: nowrap;
	}
	.ref.prose {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
	}
	.ref:hover {
		color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground));
		text-decoration: underline;
	}
	.ref:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
	.codicon {
		font-size: 0.95em;
		vertical-align: -1px;
	}
	.codicon:first-child {
		margin-right: 4px;
	}
	.codicon-link-external {
		margin-left: 3px;
		font-size: 0.85em;
		color: var(--vscode-descriptionForeground);
	}
</style>
