import type { SubgraphAttributesObject } from "ts-graphviz";

/** Font used by every generated diagram. */
export const FONT = "sans-serif";

/**
 * CSS embedded in the SVG: text gets a white halo so labels stay legible where
 * they cross edges, and namespace clusters are drawn as soft filled areas.
 */
export const STYLESHEET = `\
.graph text {
	font-family: ${FONT};
	stroke: white;
	paint-order: stroke;
	stroke-width: 3;
	stroke-linecap: square;
}

.namespace polygon {
	fill-opacity: 0.2;
	stroke: none;
}
`;

/** The `stylesheet` graph attribute carrying {@link STYLESHEET}. */
export const STYLESHEET_ATTRIBUTE = `data:text/css,${encodeURIComponent(STYLESHEET)}`;

/** Attributes for a cluster that groups nodes under a namespace. */
export function namespaceCluster(label: string): SubgraphAttributesObject {
	return {
		// @ts-expect-error cluster is a valid subgraph attribute
		cluster: true,
		class: "namespace",
		label,
		style: "filled",
		color: "lightgrey",
		fontsize: 10,
		fontname: FONT,
	};
}

/** Escapes text for use inside a Graphviz HTML-like label. */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
