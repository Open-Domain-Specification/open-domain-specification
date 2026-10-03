import { hashToModelRef, modelRefToHash } from "./ref-transport";

/**
 * What the router writes into each session-history entry it knows. `gen`
 * names one run of history (a page load, or the stretch since `reset`), so an
 * entry left by an earlier run, or by someone else, is never mistaken for one
 * of this run's. `index` is the entry's place in this run, counted from the
 * first page shown, and `ref` the page the entry holds.
 */
type Entry = { gen: string; index: number; ref: string };

/**
 * Hash router. Canonical model refs are encoded once when carried in the URL
 * fragment and decoded once on arrival. `#` or empty is the workspace.
 *
 * Route anchors are also handled on click rather than left to the browser: the
 * VS Code webview host intercepts every same-page hash link, prevents its
 * default and only scrolls to a matching id, so the hash would never change.
 *
 * `arrivals` counts the times a reader, not the host, has arrived at a route:
 * following a route anchor, or history (back, forward, an edited hash). The
 * page moves focus to its heading on each, and stays where it is for `go`,
 * which is what the host calls when the editor's tree view opens a page.
 *
 * The router also owns a position in that history, for hosts that draw their
 * own Back and Forward (the extension's toolbar). `history.length` cannot be
 * that position: it counts every entry the webview ever made, including the
 * blank one beneath the first page and entries from a workspace long gone.
 * So each entry the router makes carries its own index in `history.state`
 * (see `Entry`), `canGoBack` and `canGoForward` read it, and `back` and
 * `forward` never ask the browser for an entry outside what this run made.
 * Page identity on a traversal comes from that state, not from the hash: the
 * webview host does not always raise `hashchange` when the hash empties.
 * `reset` starts a new run at a page, replacing the current entry, which is
 * how a different workspace (or the first page the host shows) becomes the
 * boundary that Back cannot pass.
 *
 * An entry the router did not stamp (the reader edited the hash, or a diagram
 * node set it) is adopted as the page after the current one, which is what a
 * new hash entry is, and is read from its hash as before.
 */
export function createRouter() {
	let ref = $state(read());
	let arrivals = $state(0);
	let index = $state(0);
	let last = $state(0);
	let gen = newGen();
	// The runs `reset` has ended. A traversal the browser was already making
	// when the host reset cannot be called off, and may land on an entry of one
	// of these: a page of the workspace that was just replaced.
	const ended = new Set<string>();
	// Where the reader has asked history to end up, and whether a traversal
	// toward it is under way. One is in flight at a time, so a burst of Back or
	// Forward presses is counted against the ends of this run's entries and
	// not against whatever entry the browser has reached so far.
	let landing = 0;
	let travelling = false;
	// True while `go` is assigning the hash. Chromium (so the webview) raises
	// `popstate` from inside that assignment, before `go` has set `ref` or
	// stamped the entry; jsdom raises it after. Either way it is the router's
	// own navigation and not history, so it is not read as the reader's.
	let assigning = false;
	function read(): string {
		if (typeof location === "undefined") return "#";
		return hashToModelRef(location.hash) ?? "#";
	}
	function newGen(): string {
		return Math.random().toString(36).slice(2);
	}
	/** Records the current entry's place in this run. */
	function stamp() {
		history.replaceState({ ods: { gen, index, ref } satisfies Entry }, "");
	}
	/** The entry history is on, if this run made it. */
	function here(): Entry | undefined {
		const entry = (history.state as { ods?: Entry } | null)?.ods;
		return entry?.gen === gen ? entry : undefined;
	}
	/**
	 * An entry the router did not stamp was added above the current one, and is
	 * read from its hash. One left by a run `reset` has ended is neither: it is
	 * a page of the workspace that was replaced, so it is not read at all. The
	 * entry reached takes the place of the one the reset made (the browser will
	 * not let that traversal be undone), with no arrival, and the run goes on
	 * from there as it began, with Back and Forward at their ends.
	 */
	function adopt() {
		const left = (history.state as { ods?: Entry } | null)?.ods?.gen;
		if (left && ended.has(left)) {
			history.replaceState(null, "", modelRefToHash(ref));
			landing = index;
			travelling = false;
			stamp();
			return;
		}
		const next = read();
		if (next === ref) return;
		ref = next;
		arrivals += 1;
		index += 1;
		last = index;
		landing = index;
		travelling = false;
		stamp();
	}
	/** Moves history one traversal toward `landing`. */
	function step() {
		travelling = true;
		history.go(landing - index);
	}
	/** History moved to an entry of this run, or off to one that is not. */
	function onPopState() {
		if (assigning) return;
		const entry = here();
		if (!entry) return adopt();
		index = entry.index;
		if (entry.ref !== ref) {
			ref = entry.ref;
			arrivals += 1;
		}
		if (!travelling) landing = index;
		else if (index === landing) travelling = false;
		else step();
	}
	/** A hash change is history too when it did not come with an entry of this run (an edited hash). */
	function onHashChange() {
		if (assigning) return;
		if (!here()) adopt();
	}
	if (typeof window !== "undefined") {
		stamp();
		// `go` sets `ref` itself, so a change that finds a new
		// ref is history: the reader pressed back or forward, or edited the hash.
		window.addEventListener("hashchange", onHashChange);
		window.addEventListener("popstate", onPopState);
		document.addEventListener("click", onClick, true);
	}
	function destroy() {
		window.removeEventListener("hashchange", onHashChange);
		window.removeEventListener("popstate", onPopState);
		document.removeEventListener("click", onClick, true);
	}
	function onClick(e: MouseEvent) {
		if (e.defaultPrevented || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const anchor = (e.target as Element | null)?.closest?.("a[href]");
		if (!anchor || anchor.getAttribute("target")) return;
		// The selector guarantees the attribute.
		const href = anchor.getAttribute("href") as string;
		const next = hashToModelRef(href);
		if (!next || !isRoute(next)) return;
		e.preventDefault();
		go(next);
		arrivals += 1;
	}
	/** Route hashes are `#` or `#/…`; section anchors like `#overview` are left to the page. */
	function isRoute(href: string): boolean {
		return href === "#" || href.startsWith("#/");
	}
	function go(next: string) {
		const hash = modelRefToHash(next);
		if (location.hash === hash || (next === "#" && location.hash === "")) {
			ref = read();
			return;
		}
		assigning = true;
		try {
			location.hash = hash;
		} finally {
			assigning = false;
		}
		ref = read();
		index += 1;
		last = index;
		landing = index;
		travelling = false;
		stamp();
	}
	/** Starts a new run of history at `next`, replacing the current entry. */
	function reset(next: string) {
		history.replaceState(null, "", modelRefToHash(next));
		ref = read();
		ended.add(gen);
		gen = newGen();
		index = 0;
		last = 0;
		landing = 0;
		travelling = false;
		stamp();
	}
	function travel(to: number) {
		if (to < 0 || to > last) return;
		landing = to;
		if (!travelling) step();
	}
	return {
		get ref() {
			return ref;
		},
		get arrivals() {
			return arrivals;
		},
		get canGoBack() {
			return index > 0;
		},
		get canGoForward() {
			return index < last;
		},
		go,
		reset,
		back: () => travel(landing - 1),
		forward: () => travel(landing + 1),
		destroy,
	};
}
