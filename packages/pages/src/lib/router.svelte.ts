/**
 * Hash router. A ref is already a hash (`#/domains/sales`), so the location
 * hash is the current ref and plain anchors navigate. `#` or empty is the workspace.
 */
export function createRouter() {
	let ref = $state(read());
	function read(): string {
		const raw =
			typeof location === "undefined" ? "" : decodeURIComponent(location.hash);
		return raw.length > 2 ? raw.replace(/\/$/, "") : "#";
	}
	if (typeof window !== "undefined")
		window.addEventListener("hashchange", () => {
			ref = read();
		});
	return {
		get ref() {
			return ref;
		},
		go(next: string) {
			location.hash = next;
		},
	};
}
