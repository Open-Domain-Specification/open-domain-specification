/**
 * Hash router. A ref is already a hash (`#/domains/sales`), so the location
 * hash is the current ref and plain anchors navigate. `#` or empty is the workspace.
 *
 * Route anchors are also handled on click rather than left to the browser: the
 * VS Code webview host intercepts every same-page hash link, prevents its
 * default and only scrolls to a matching id, so the hash would never change.
 *
 * `arrivals` counts the times a reader, not the host, has arrived at a route:
 * following a route anchor, or history (back, forward, an edited hash). The
 * page moves focus to its heading on each, and stays where it is for `go`,
 * which is what the host calls when the editor's tree view opens a page.
 */
export function createRouter() {
	let ref = $state(read());
	let arrivals = $state(0);
	function read(): string {
		if (typeof location === "undefined") return "#";
		let raw = location.hash;
		try {
			raw = decodeURIComponent(raw);
		} catch {
			// A malformed escape (`#/search?q=100%`) is kept verbatim rather than crashing the app.
		}
		return raw.length > 2 ? raw.replace(/\/$/, "") : "#";
	}
	if (typeof window !== "undefined") {
		// `go` sets `ref` itself, so a hashchange that finds a new
		// ref is history: the reader pressed back or forward, or edited the hash.
		window.addEventListener("hashchange", () => {
			const next = read();
			if (next === ref) return;
			ref = next;
			arrivals += 1;
		});
		document.addEventListener("click", onClick, true);
	}
	function onClick(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const anchor = (e.target as Element | null)?.closest?.("a[href]");
		if (!anchor || anchor.getAttribute("target")) return;
		// The selector guarantees the attribute.
		const href = anchor.getAttribute("href") as string;
		if (!isRoute(href)) return;
		e.preventDefault();
		go(href);
		arrivals += 1;
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
		ref = read();
	}
	return {
		get ref() {
			return ref;
		},
		get arrivals() {
			return arrivals;
		},
		go,
	};
}
