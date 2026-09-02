/**
 * The class that switches a node card into its sketch-style ellipse. Shared
 * by every node type that supports the sketch diagram style.
 */
export function sketchClass(data: { sketch?: boolean }): string {
	return data.sketch ? "sketch" : "";
}
