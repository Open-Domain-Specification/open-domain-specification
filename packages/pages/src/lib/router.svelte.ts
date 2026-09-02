/**
 * Hash router. A ref is already a hash (`#/domains/sales`), so the location
 * hash is the current ref and plain anchors navigate. `#` or empty is the workspace.
 *
 * Route anchors are also handled on click rather than left to the browser: the
 * VS Code webview host intercepts every same-page hash link, prevents its
 * default and only scrolls to a matching id, so the hash would never change.
 */
export function createRouter() {
	let ref = $state(read());
	function read(): string {
		const raw =
			typeof location === "undefined" ? "" : decodeURIComponent(location.hash);
		return raw.length > 2 ? raw.replace(/\/$/, "") : "#";
	}
	if (typeof window !== "undefined") {
		window.addEventListener("hashchange", () => {
			ref = read();
		});
		document.addEventListener("click", onClick, true);
	}
	function onClick(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const anchor = (e.target as Element | null)?.closest?.("a[href]");
		if (!anchor || anchor.getAttribute("target")) return;
		const href = anchor.getAttribute("href") ?? "";
		if (!isRoute(href)) return;
		e.preventDefault();
		go(href);
	}
	/** Route hashes are `#` or `#/…`; section anchors like `#overview` are left to the page. */
	function isRoute(href: string): boolean {
		return href === "#" || href.startsWith("#/");
	}
	function go(next: string) {
		if (location.hash === next || (next === "#" && location.hash === "")) {
			ref = read();
			return;
		}
		location.hash = next;
	}
	return {
		get ref() {
			return ref;
		},
		go,
	};
}
