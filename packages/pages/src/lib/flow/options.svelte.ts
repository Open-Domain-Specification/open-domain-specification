/**
 * Viewer preferences for the interactive diagrams: where edges attach to
 * nodes, how they are drawn, and whether nodes are cards in shaded clusters
 * or sketch-style ellipses over a Voronoi backdrop. Remembered per browser
 * so a choice sticks across pages and visits.
 */
export type HandleMode = "fixed" | "floating";
export type EdgeStyle = "bezier" | "straight" | "step" | "smoothstep";
export type DiagramStyle = "cards" | "sketch";

export type DiagramOptions = {
	handles: HandleMode;
	edges: EdgeStyle;
	style: DiagramStyle;
};

export const HANDLE_MODES: HandleMode[] = ["fixed", "floating"];
export const EDGE_STYLES: EdgeStyle[] = [
	"bezier",
	"straight",
	"step",
	"smoothstep",
];
export const DIAGRAM_STYLES: DiagramStyle[] = ["cards", "sketch"];

const KEY = "ods-diagram-options";
const DEFAULTS: DiagramOptions = {
	handles: "fixed",
	edges: "bezier",
	style: "cards",
};

function read(): DiagramOptions {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...DEFAULTS };
		const parsed = JSON.parse(raw) as Partial<DiagramOptions>;
		return {
			handles: HANDLE_MODES.includes(parsed.handles as HandleMode)
				? (parsed.handles as HandleMode)
				: DEFAULTS.handles,
			edges: EDGE_STYLES.includes(parsed.edges as EdgeStyle)
				? (parsed.edges as EdgeStyle)
				: DEFAULTS.edges,
			style: DIAGRAM_STYLES.includes(parsed.style as DiagramStyle)
				? (parsed.style as DiagramStyle)
				: DEFAULTS.style,
		};
	} catch {
		return { ...DEFAULTS };
	}
}

function write(options: DiagramOptions): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(options));
	} catch {
		// Storage may be unavailable; the choice still applies for this page.
	}
}

/** Shared, reactive options; every diagram on a page follows the same choice. */
export function createDiagramOptions() {
	let current = $state<DiagramOptions>(read());
	return {
		get handles() {
			return current.handles;
		},
		get edges() {
			return current.edges;
		},
		get style() {
			return current.style;
		},
		set(patch: Partial<DiagramOptions>) {
			current = { ...current, ...patch };
			write(current);
		},
	};
}

export const diagramOptions = createDiagramOptions();
