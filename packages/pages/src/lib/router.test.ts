import { afterEach, describe, expect, it, vi } from "vitest";
import { modelRefToHash } from "./ref-transport";
import { createRouter } from "./router.svelte";

// Every router listens on the window and the document for the life of the
// page. Each test makes its own, so each is destroyed after the test, or an
// earlier router would take an event before the one under test saw it.
const made: ReturnType<typeof createRouter>[] = [];
const make = () => {
	const router = createRouter();
	made.push(router);
	return router;
};

afterEach(async () => {
	for (const router of made.splice(0)) router.destroy();
	location.hash = "";
	// jsdom raises the events for a hash change after the test that made it.
	await new Promise((resolve) => setTimeout(resolve, 10));
});

describe("createRouter", () => {
	it("starts at the workspace when the hash is empty", () => {
		location.hash = "";
		const router = make();
		expect(router.ref).toBe("#");
	});

	it("treats a bare '#' or a single-character hash as the workspace", () => {
		location.hash = "#a";
		const router = make();
		expect(router.ref).toBe("#");
	});

	it("preserves a terminal empty segment in the current hash", () => {
		location.hash = modelRefToHash("#/domains/sales/");
		const router = make();
		expect(router.ref).toBe("#/domains/sales/");
	});

	it("rejects a malformed transport escape without throwing", () => {
		location.hash = "#/search?q=100%";
		const router = make();
		expect(router.ref).toBe("#");
	});

	it("keeps a hash with no trailing slash as-is", () => {
		location.hash = modelRefToHash("#/domains/sales");
		const router = make();
		expect(router.ref).toBe("#/domains/sales");
	});

	it("updates ref when the hash changes", () => {
		location.hash = "";
		const router = make();
		expect(router.ref).toBe("#");
		location.hash = modelRefToHash("#/teams/pet_shop_team");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#/teams/pet_shop_team");
	});

	it("preserves identity through direct load and simulated back navigation", () => {
		const percent = "#/boundedcontexts/%2F";
		const unicode = "#/boundedcontexts/é";
		location.hash = modelRefToHash(percent);
		const router = make();
		expect(router.ref).toBe(percent);
		location.hash = modelRefToHash(unicode);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe(unicode);
		location.hash = modelRefToHash(percent);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe(percent);
	});

	it("go() navigates by setting the location hash", () => {
		location.hash = "";
		const router = make();
		router.go("#/domains/sales");
		expect(location.hash).toBe(modelRefToHash("#/domains/sales"));
	});

	it("go() carries an unpaired UTF-16 identity through the reserved transport", () => {
		const ref = "#/boundedcontexts/\ud800";
		location.hash = "";
		const router = make();
		router.go(ref);
		expect(location.hash).toBe(modelRefToHash(ref));
		expect(router.ref).toBe(ref);
	});

	it("starts at the workspace when there is no location, as in SSR", () => {
		vi.stubGlobal("location", undefined);
		try {
			const router = make();
			expect(router.ref).toBe("#");
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe("createRouter link delegation", () => {
	const click = (a: HTMLAnchorElement, init: MouseEventInit = {}) => {
		const e = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			button: 0,
			...init,
		});
		a.dispatchEvent(e);
		return e;
	};
	const anchor = (href: string) => {
		const a = document.createElement("a");
		a.href = href;
		a.textContent = "link";
		document.body.appendChild(a);
		return a;
	};
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("navigates route anchors itself so the webview host cannot swallow them", () => {
		location.hash = "";
		const router = make();
		const e = click(anchor(modelRefToHash("#/domains/sales")));
		expect(e.defaultPrevented).toBe(true);
		expect(location.hash).toBe(modelRefToHash("#/domains/sales"));
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#/domains/sales");
	});

	it("leaves section anchors and modified clicks to the browser", () => {
		location.hash = "";
		make();
		expect(click(anchor("#overview")).defaultPrevented).toBe(false);
		expect(
			click(anchor(modelRefToHash("#/domains/sales")), { metaKey: true })
				.defaultPrevented,
		).toBe(false);
		expect(location.hash).toBe("");
	});

	it("leaves a click another handler took, and one that is not the primary button, alone", async () => {
		location.hash = "";
		make();
		const href = modelRefToHash("#/domains/sales");
		const taken = new MouseEvent("click", { bubbles: true, cancelable: true });
		taken.preventDefault();
		anchor(href).dispatchEvent(taken);
		click(anchor(href), { button: 1 });
		expect(location.hash).toBe("");
	});

	it("treats a bare '#' anchor as the workspace", () => {
		location.hash = modelRefToHash("#/domains/sales");
		const router = make();
		click(anchor("#"));
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#");
	});
});

describe("createRouter arrivals", () => {
	const anchor = (href: string) => {
		const a = document.createElement("a");
		a.href = href;
		document.body.appendChild(a);
		return a;
	};
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("counts a followed route anchor once, not again when the hash change lands", () => {
		location.hash = "";
		const router = make();
		expect(router.arrivals).toBe(0);
		anchor(modelRefToHash("#/domains/sales")).click();
		expect(router.arrivals).toBe(1);
		expect(router.ref).toBe("#/domains/sales");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.arrivals).toBe(1);
	});

	it("counts following a link to the page the reader is already on", () => {
		location.hash = modelRefToHash("#/domains/sales");
		const router = make();
		anchor(modelRefToHash("#/domains/sales")).click();
		expect(router.arrivals).toBe(1);
	});

	it("counts history navigation, which changes the hash without the router", () => {
		location.hash = "";
		const router = make();
		location.hash = modelRefToHash("#/teams/pet_shop_team");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#/teams/pet_shop_team");
		expect(router.arrivals).toBe(1);
	});

	it("does not count go(), which is the host opening a page, and ignores its hash change", () => {
		location.hash = "";
		const router = make();
		router.go("#/domains/sales");
		expect(router.ref).toBe("#/domains/sales");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		router.go("#/domains/sales");
		expect(router.arrivals).toBe(0);
	});

	it("does not count section anchors it leaves to the browser", () => {
		location.hash = "";
		const router = make();
		anchor("#overview").click();
		expect(router.arrivals).toBe(0);
	});
});

describe("createRouter owned history", () => {
	const P1 = "#/boundedcontexts/catalog_bc";
	const P2 = "#/boundedcontexts/catalog_bc/aggregates/pet";
	const P3 = "#/teams/pet_shop_team";

	/** Resolves once `count` traversals have landed, as the browser reports them. */
	const landed = (count = 1) =>
		new Promise<void>((resolve) => {
			let seen = 0;
			const onPop = () => {
				seen += 1;
				if (seen < count) return;
				window.removeEventListener("popstate", onPop);
				resolve();
			};
			window.addEventListener("popstate", onPop);
		});
	/** Gives a traversal that should not happen time to show that it did not. */
	const quiet = () => new Promise((resolve) => setTimeout(resolve, 30));
	const watching: EventListener[] = [];
	const popstates = () => {
		const seen: unknown[] = [];
		const onPop = () => seen.push(history.state);
		watching.push(onPop);
		window.addEventListener("popstate", onPop);
		return seen;
	};
	afterEach(() => {
		for (const onPop of watching.splice(0))
			window.removeEventListener("popstate", onPop);
	});
	/** A router whose first page is `first`, as the host's first model message makes it. */
	const startAt = async (first: string, ...then: string[]) => {
		const router = make();
		router.reset(first);
		for (const next of then) router.go(next);
		// The events for those hash changes arrive after them; let them pass
		// before a traversal is waited for.
		await quiet();
		return router;
	};

	it("walks back P3, P2, P1 and forward again to the exact page each time", async () => {
		const router = await startAt(P1, P2, P3);
		expect(router.ref).toBe(P3);
		router.back();
		await landed();
		expect(router.ref).toBe(P2);
		expect(location.hash).toBe(modelRefToHash(P2));
		router.back();
		await landed();
		expect(router.ref).toBe(P1);
		expect(router.canGoBack).toBe(false);
		expect(router.canGoForward).toBe(true);
		router.forward();
		await landed();
		expect(router.ref).toBe(P2);
		router.forward();
		await landed();
		expect(router.ref).toBe(P3);
		expect(router.canGoBack).toBe(true);
		expect(router.canGoForward).toBe(false);
		// Each of the four is the reader arriving, so the page focuses its heading.
		expect(router.arrivals).toBe(4);
	});

	it("returns to the workspace, the first page shown, when it was the root", async () => {
		const router = await startAt("#", P2);
		router.back();
		await landed();
		expect(router.ref).toBe("#");
		expect(location.hash).toBe("");
		expect(router.canGoBack).toBe(false);
	});

	it("takes the page from the entry reached, not from a hashchange the host may not raise", async () => {
		const swallow = (e: Event) => e.stopImmediatePropagation();
		window.addEventListener("hashchange", swallow);
		try {
			const router = await startAt("#", P2);
			router.back();
			await landed();
			await quiet();
			expect(location.hash).toBe("");
			expect(router.ref).toBe("#");
			expect(router.arrivals).toBe(1);
		} finally {
			window.removeEventListener("hashchange", swallow);
		}
	});

	it("treats the first non-root page as the boundary Back cannot pass", async () => {
		const router = await startAt(P1);
		expect(router.canGoBack).toBe(false);
		expect(router.canGoForward).toBe(false);
		const seen = popstates();
		router.back();
		await quiet();
		expect(seen).toEqual([]);
		expect(router.ref).toBe(P1);
		router.go(P2);
		await quiet();
		router.back();
		await landed();
		expect(router.ref).toBe(P1);
		router.back();
		await quiet();
		expect(router.ref).toBe(P1);
		expect(location.hash).toBe(modelRefToHash(P1));
		expect(router.canGoBack).toBe(false);
	});

	it("drops Forward when a new page is opened after going back", async () => {
		const router = await startAt(P1, P2, P3);
		router.back();
		await landed();
		expect(router.canGoForward).toBe(true);
		router.go("#/teams/orders_team");
		await quiet();
		expect(router.canGoForward).toBe(false);
		expect(router.canGoBack).toBe(true);
		const seen = popstates();
		router.forward();
		await quiet();
		expect(seen).toEqual([]);
		expect(router.ref).toBe("#/teams/orders_team");
		router.back();
		await landed();
		expect(router.ref).toBe(P2);
	});

	it("adds no entry when the page being opened is the one shown", async () => {
		const router = await startAt(P1);
		const before = history.length;
		router.go(P1);
		router.go(P1);
		expect(history.length).toBe(before);
		expect(router.canGoBack).toBe(false);
		router.go(P2);
		router.go(P2);
		expect(history.length).toBe(before + 1);
		expect(router.canGoBack).toBe(true);
	});

	it("keeps rapid Back and Forward inside the pages this run opened", async () => {
		const router = await startAt(P1, P2, P3);
		const seen = popstates();
		for (let press = 0; press < 5; press += 1) router.back();
		await landed(2);
		await quiet();
		expect(seen).toHaveLength(2);
		expect(router.ref).toBe(P1);
		expect(router.canGoBack).toBe(false);
		for (let press = 0; press < 5; press += 1) router.forward();
		await landed(2);
		await quiet();
		expect(seen).toHaveLength(4);
		expect(router.ref).toBe(P3);
		expect(router.canGoForward).toBe(false);
		router.back();
		router.forward();
		await quiet();
		expect(router.ref).toBe(P3);
	});

	it("follows a traversal the router did not ask for, and counts later ones from there", async () => {
		const router = await startAt(P1, P2, P3);
		history.back();
		await landed();
		expect(router.ref).toBe(P2);
		expect(router.canGoForward).toBe(true);
		router.back();
		await landed();
		expect(router.ref).toBe(P1);
		expect(router.canGoBack).toBe(false);
	});

	it("starts over at a new workspace, whose first page Back cannot pass", async () => {
		const router = await startAt(P1, P2, P3);
		const arrivals = router.arrivals;
		router.reset("#/teams/orders_team");
		expect(router.ref).toBe("#/teams/orders_team");
		expect(location.hash).toBe(modelRefToHash("#/teams/orders_team"));
		expect(router.canGoBack).toBe(false);
		expect(router.canGoForward).toBe(false);
		expect(router.arrivals).toBe(arrivals);
		const seen = popstates();
		router.back();
		router.forward();
		await quiet();
		expect(seen).toEqual([]);
		router.go(P1);
		await quiet();
		router.back();
		await landed();
		expect(router.ref).toBe("#/teams/orders_team");
		router.back();
		await quiet();
		expect(router.ref).toBe("#/teams/orders_team");
	});

	it("does not let a Back already on its way carry a new workspace to a page of the old one", async () => {
		const router = await startAt(P1, P2, P3);
		const arrivals = router.arrivals;
		router.back();
		// The traversal is under way and cannot be called off; the host now
		// shows a different workspace.
		router.reset("#/teams/orders_team");
		await quiet();
		expect(router.ref).toBe("#/teams/orders_team");
		expect(location.hash).toBe(modelRefToHash("#/teams/orders_team"));
		expect(router.canGoBack).toBe(false);
		expect(router.canGoForward).toBe(false);
		expect(router.arrivals).toBe(arrivals);
		expect(history.state.ods).toMatchObject({
			index: 0,
			ref: "#/teams/orders_team",
		});
	});

	it("starts over at the workspace when the host names no page", async () => {
		const router = await startAt(P1, P2);
		router.reset("#");
		expect(router.ref).toBe("#");
		expect(location.hash).toBe("");
		expect(router.canGoBack).toBe(false);
	});

	it("adopts a hash the reader edited as the page after this one, and can go back from it", async () => {
		const router = await startAt(P1, P2);
		location.hash = modelRefToHash(P3);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe(P3);
		expect(router.arrivals).toBe(1);
		expect(router.canGoBack).toBe(true);
		expect(router.canGoForward).toBe(false);
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(router.arrivals).toBe(1);
		await quiet();
		router.back();
		await landed();
		expect(router.ref).toBe(P2);
		expect(router.canGoForward).toBe(true);
	});

	it("ignores a history event whose entry holds the page already shown", async () => {
		const router = await startAt(P1, P2);
		history.replaceState(null, "");
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(router.ref).toBe(P2);
		expect(router.arrivals).toBe(0);
		expect(router.canGoBack).toBe(true);
	});

	it("does not take an entry stamped by another run for its own", async () => {
		const router = await startAt(P1, P2);
		history.replaceState({ ods: { gen: "elsewhere", index: 0, ref: P3 } }, "");
		window.dispatchEvent(new PopStateEvent("popstate"));
		// Its hash is what is read, as for any entry the router did not make.
		expect(router.ref).toBe(P2);
		expect(router.arrivals).toBe(0);
	});

	it("stops listening once destroyed", async () => {
		const router = await startAt(P1);
		router.destroy();
		location.hash = modelRefToHash(P3);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe(P1);
		const a = document.createElement("a");
		a.href = modelRefToHash(P2);
		document.body.appendChild(a);
		a.click();
		a.remove();
		expect(router.arrivals).toBe(0);
	});
});

describe("createRouter assigning the hash itself", () => {
	const P1 = "#/boundedcontexts/catalog_bc";
	const P2 = "#/boundedcontexts/catalog_bc/aggregates/pet";
	const P3 = "#/teams/pet_shop_team";

	/**
	 * Chromium, and so the VS Code webview, raises `popstate` (then, later,
	 * `hashchange`) from inside the assignment to `location.hash`, before it
	 * returns. jsdom raises both after. This stands in for a location whose hash
	 * setter raises `events` synchronously, as a browser does.
	 */
	const raisingSynchronously = (...events: Event[]) => {
		const real = location;
		vi.stubGlobal(
			"location",
			new Proxy(real, {
				get: (target, key) => {
					const value = Reflect.get(target, key, target);
					return typeof value === "function" ? value.bind(target) : value;
				},
				set: (target, key, value) => {
					Reflect.set(target, key, value, target);
					if (key === "hash") for (const e of events) window.dispatchEvent(e);
					return true;
				},
			}),
		);
	};
	afterEach(() => vi.unstubAllGlobals());

	it("ignores the popstate its own assignment raises: no arrival, one step", () => {
		location.hash = "";
		const router = make();
		router.reset(P1);
		raisingSynchronously(new PopStateEvent("popstate", { state: null }));
		router.go(P2);
		expect(router.ref).toBe(P2);
		expect(router.arrivals).toBe(0);
		expect(router.canGoBack).toBe(true);
		expect(router.canGoForward).toBe(false);
		router.go(P3);
		expect(router.arrivals).toBe(0);
		expect(history.state.ods).toMatchObject({ index: 2, ref: P3 });
	});

	it("ignores a hashchange raised inside the assignment and the one that follows it", async () => {
		location.hash = "";
		const router = make();
		router.reset(P1);
		raisingSynchronously(
			new PopStateEvent("popstate", { state: null }),
			new HashChangeEvent("hashchange"),
		);
		router.go(P2);
		expect(router.arrivals).toBe(0);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(router.arrivals).toBe(0);
		expect(router.ref).toBe(P2);
		expect(history.state.ods.index).toBe(1);
		expect(router.canGoBack).toBe(true);
		expect(router.canGoForward).toBe(false);
	});

	it("still adopts a hash the reader edits afterwards", () => {
		location.hash = "";
		const router = make();
		router.reset(P1);
		raisingSynchronously(new PopStateEvent("popstate", { state: null }));
		router.go(P2);
		vi.unstubAllGlobals();
		location.hash = modelRefToHash(P3);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe(P3);
		expect(router.arrivals).toBe(1);
		expect(history.state.ods.index).toBe(2);
	});
});
