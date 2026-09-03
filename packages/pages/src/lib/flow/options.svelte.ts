/**
 * Viewer preferences for the interactive diagrams: where edges attach to
 * nodes, how they are drawn, and whether nodes are sketch-style ellipses over
 * a Voronoi backdrop (the default) or cards in shaded clusters, and whether the legend
 * is collapsed. Remembered per browser so a choice sticks across pages and
 * visits.
 */
import type { DiagramKind } from "./kind";
export type HandleMode = "fixed" | "floating";
export type EdgeStyle = "bezier" | "straight" | "step" | "smoothstep";
export type DiagramStyle = "cards" | "sketch";

export type DiagramOptions = {
	/** Absent means no explicit user override: the per-kind default applies. */
	handles?: HandleMode;
	edges: EdgeStyle;
	style: DiagramStyle;
	legendCollapsed: boolean;
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
const DEFAULTS: Omit<DiagramOptions, "handles"> = {
	edges: "bezier",
	style: "sketch",
	legendCollapsed: false,
};

/** Context maps default to floating handles; every other kind stays fixed. */
export function defaultHandles(kind: DiagramKind): HandleMode {
	return kind === "context" ? "floating" : "fixed";
}

function read(): DiagramOptions {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...DEFAULTS };
		const parsed = JSON.parse(raw) as Partial<DiagramOptions>;
		return {
			...(HANDLE_MODES.includes(parsed.handles as HandleMode)
				? { handles: parsed.handles as HandleMode }
				: {}),
			edges: EDGE_STYLES.includes(parsed.edges as EdgeStyle)
				? (parsed.edges as EdgeStyle)
				: DEFAULTS.edges,
			style: DIAGRAM_STYLES.includes(parsed.style as DiagramStyle)
				? (parsed.style as DiagramStyle)
				: DEFAULTS.style,
			legendCollapsed: parsed.legendCollapsed === true,
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
		/** The effective handle mode for a diagram kind: the user's override, else the kind's default. */
		handlesFor(kind: DiagramKind): HandleMode {
			return current.handles ?? defaultHandles(kind);
		},
		get edges() {
			return current.edges;
		},
		get style() {
			return current.style;
		},
		get legendCollapsed() {
			return current.legendCollapsed;
		},
		set(patch: Partial<DiagramOptions>) {
			current = { ...current, ...patch };
			write(current);
		},
	};
}

export const diagramOptions = createDiagramOptions();
