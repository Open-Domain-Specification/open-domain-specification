/**
 * Whether a diagram's legend is open, and who said so.
 *
 * Two things can close it. The fit can: when reserving the legend's column
 * would squeeze the map below the readable floor (`legendGivesWay` in
 * `panel-fit.ts`), the legend gives way and the map keeps the room. The
 * reader can: the header is a toggle, and once they have used it their choice
 * outranks the fit on every diagram on the page — a reader who opens the
 * legend on a crowded map meant to open it.
 *
 * The reader's choice is remembered for the session and no longer, because it
 * answers one map in one window rather than stating a preference: reopening
 * the workspace tomorrow, or the same page in a wider editor, should start
 * from what fits again. It rides in `sessionStorage` behind a try/catch, as
 * the design language requires of any storage, so a webview with storage
 * denied still works — the choice simply lasts as long as the page.
 */

const KEY = "ods-legend-expanded";

/** The reader's own say for this session, or nothing said yet. */
export type LegendChoice = "expanded" | "collapsed" | undefined;

function read(): LegendChoice {
	try {
		const raw = sessionStorage.getItem(KEY);
		return raw === "expanded" || raw === "collapsed" ? raw : undefined;
	} catch {
		return undefined;
	}
}

function write(choice: Exclude<LegendChoice, undefined>): void {
	try {
		sessionStorage.setItem(KEY, choice);
	} catch {
		// Storage may be denied; the choice still holds for this page.
	}
}

/** Shared: one legend opened is every legend on the page opened. */
let choice = $state<LegendChoice>(read());

/** Forgets what is held and reads the session back, as a fresh page does. */
export function resetLegendChoice(): void {
	choice = read();
}

export type LegendState = {
	/** Whether the terms are hidden, by the reader's choice or by the fit. */
	readonly collapsed: boolean;
	/** Whether the fit asked this legend to give way. */
	readonly crowded: boolean;
	/** The fit ran out of room: give way unless the reader has already spoken. */
	crowd(): void;
	/** The reader's say, for this diagram and every other, for this session. */
	toggle(): void;
};

/** One legend's state: this diagram's fit verdict under the shared choice. */
export function createLegendState(): LegendState {
	let crowded = $state(false);
	const collapsed = () => (choice ? choice === "collapsed" : crowded);
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
			const next = collapsed() ? "expanded" : "collapsed";
			choice = next;
			write(next);
		},
	};
}
