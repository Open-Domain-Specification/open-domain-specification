const FOCUSABLE = "a[href],button,input,select,textarea,summary,[tabindex]";

/**
 * Moves focus to somewhere a reader has just arrived. Something that is not
 * already focusable is made a programmatic target with `tabindex="-1"`, which
 * lets script focus it without adding it to the Tab order, so the next Tab is
 * the next control after it. `preventScroll` is for callers that have already
 * placed the element themselves.
 */
export function focusArrival(el: HTMLElement, options?: FocusOptions) {
	if (!el.matches(FOCUSABLE)) el.setAttribute("tabindex", "-1");
	el.focus(options);
}
