/**
 * The class that switches a node card into its sketch-style ellipse. Only
 * the context map has the sketch style, so only the context node uses it.
 */
export function sketchClass(data: { sketch?: boolean }): string {
	return data.sketch ? "sketch" : "";
}
