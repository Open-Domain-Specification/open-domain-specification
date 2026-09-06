/**
 * Whether a diagram's floating panel is open, and who said so.
 *
 * Both panels — the legend at the top left, the options at the top right —
 * are sections that open and close, and the fit can close either of them. The
 * order the fit works down is in `panel-fit.ts`; this module holds the answer
 * for one panel.
 *
 * Two parties decide. The fit does: when the room a panel claims would squeeze
 * the map below the readable floor, that panel gives way. The reader does: the
 * header is a toggle, and once they have used it their choice outranks the fit
 * for that panel on every diagram on the page — a reader who opens the legend
 * on a crowded map meant to open it.
 *
 * The reader's choice is remembered for the session and no longer, because it
 * answers one map in one window rather than stating a preference: reopening
 * the workspace tomorrow, or the same page in a wider editor, should start
 * from what fits again. It rides in `sessionStorage` behind a try/catch, as
 * the design language requires of any storage, so a webview with storage
 * denied still works — the choice simply lasts as long as the page.
 */

const KEY = "ods-diagram-panels";

/** The reader's own say for this session, or nothing said yet. */
export type PanelChoice = "expanded" | "collapsed" | undefined;

const choiceOf = (value: unknown): PanelChoice =>
	value === "expanded" || value === "collapsed" ? value : undefined;

function read(): Record<string, PanelChoice> {
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		return Object.fromEntries(
			Object.entries(parsed).map(([id, value]) => [id, choiceOf(value)]),
		);
	} catch {
		return {};
	}
}

function write(choices: Record<string, PanelChoice>): void {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(choices));
	} catch {
		// Storage may be denied; the choice still holds for this page.
	}
}

/** Shared: one panel opened is that panel opened on every diagram on the page. */
let choices = $state<Record<string, PanelChoice>>(read());

/** Forgets what is held and reads the session back, as a fresh page does. */
export function resetPanelChoices(): void {
	choices = read();
}

export type PanelState = {
	/** Whether the panel's body is hidden, by the reader's choice or by the fit. */
	readonly collapsed: boolean;
	/** Whether the fit asked this panel to give way. */
	readonly crowded: boolean;
	/** The fit ran out of room: give way unless the reader has already spoken. */
	crowd(): void;
	/** The reader's say, for this panel everywhere, for this session. */
	toggle(): void;
};

/** One panel's state: this diagram's fit verdict under the reader's choice. */
export function createPanelState(id: string): PanelState {
	let crowded = $state(false);
	const collapsed = () => {
		const choice = choices[id];
		return choice ? choice === "collapsed" : crowded;
	};
	return {
		get collapsed() {
			return collapsed();
		},
		get crowded() {
			return crowded;
		},
		crowd() {
			crowded = true;
		},
		toggle() {
			choices = { ...choices, [id]: collapsed() ? "expanded" : "collapsed" };
			write(choices);
		},
	};
}
