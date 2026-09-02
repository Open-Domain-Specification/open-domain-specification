/**
 * Viewer preferences for the interactive diagrams: where edges attach to
 * nodes and how they are drawn. Remembered per browser so a choice sticks
 * across pages and visits.
 */
export type HandleMode = "fixed" | "floating";
export type EdgeStyle = "bezier" | "straight" | "step" | "smoothstep";

export type DiagramOptions = { handles: HandleMode; edges: EdgeStyle };

export const HANDLE_MODES: HandleMode[] = ["fixed", "floating"];
export const EDGE_STYLES: EdgeStyle[] = [
	"bezier",
	"straight",
	"step",
	"smoothstep",
];

const KEY = "ods-diagram-options";
const DEFAULTS: DiagramOptions = { handles: "fixed", edges: "bezier" };

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
		set(patch: Partial<DiagramOptions>) {
			current = { ...current, ...patch };
			write(current);
		},
	};
}

export const diagramOptions = createDiagramOptions();
