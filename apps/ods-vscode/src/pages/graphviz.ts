import { Graphviz } from "@hpcc-js/wasm-graphviz";

let engine: Promise<Graphviz> | undefined;

/** Renders DOT to an SVG string with the bundled Graphviz wasm, loading it once. */
export async function dotToSvg(dot: string): Promise<string> {
	engine ??= Graphviz.load();
	const gv = await engine;
	const svg = gv.dot(dot, "svg");
	// Drop the XML prolog; keep width/height so the SVG has an intrinsic size for
	// `.diagram svg { max-width: 100%; height: auto }` to scale down from, never up.
	let out = svg
		.replace(/<\?xml[^>]*>\s*/, "")
		.replace(/<!DOCTYPE[^>]*>\s*/, "");

	// Graphviz's `stylesheet` graph attribute emits an `<?xml-stylesheet?>`
	// processing instruction, which an HTML parser silently drops once this SVG
	// is embedded in the page. Inline the CSS as a real <style> element instead.
	const stylesheet = out.match(
		/<\?xml-stylesheet\s+href="data:text\/css,([^"]*)"\s+type="text\/css"\?>\s*/,
	);
	if (stylesheet) {
		const css = decodeURIComponent(stylesheet[1]).replace(
			/<\/style/gi,
			"<\\/style",
		);
		out = out
			.replace(stylesheet[0], "")
			.replace(/<svg([^>]*)>/, `<svg$1><style>${css}</style>`);
	}

	return out;
}
