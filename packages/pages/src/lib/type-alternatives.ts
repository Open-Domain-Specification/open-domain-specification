const closerOf: Record<string, string> = {
	"(": ")",
	"[": "]",
	"{": "}",
	"<": ">",
};
const closers = new Set(Object.values(closerOf));
const quotes = new Set(["'", '"', "`"]);

/**
 * Where a free-form type may break: after each top-level `|` and the
 * whitespace that follows it, so `'a' | 'b'` is `["'a' | ", "'b'"]` and `A|B`
 * is `["A|", "B"]`. The pieces always join back to the input; nothing is added
 * or removed, so the text a reader selects and copies is the text the model
 * authored.
 *
 * A pipe is top level when it is outside a quoted string (a backslash escapes
 * the next character) and outside `()`, `[]`, `{}` and `<>`. Anything this
 * cannot read with confidence is returned whole rather than guessed at: an
 * unterminated quote, brackets that do not balance, an empty alternative
 * (a leading, trailing or doubled pipe), and no top-level pipe at all. `<` and
 * `>` are brackets only when they pair, so a `>` with no `<` open (an arrow
 * `=>`, a comparison `a > b`) is a mismatch and the whole type stays whole.
 * The model has no type grammar; this is display only.
 */
export const typeAlternatives = (type: string): string[] => {
	const stack: string[] = [];
	const cuts: number[] = [];
	let quote = "";
	let start = 0;
	const empty = (end: number) => type.slice(start, end).trim() === "";
	for (let i = 0; i < type.length; i++) {
		const c = type[i];
		if (quote) {
			if (c === "\\") i++;
			else if (c === quote) quote = "";
		} else if (quotes.has(c)) {
			quote = c;
		} else if (c in closerOf) {
			stack.push(closerOf[c]);
		} else if (closers.has(c)) {
			if (stack.pop() !== c) return [type];
		} else if (c === "|" && stack.length === 0) {
			if (empty(i)) return [type];
			i++;
			while (i < type.length && /\s/.test(type[i])) i++;
			cuts.push(i);
			start = i;
			i--;
		}
	}
	if (quote || stack.length || empty(type.length) || cuts.length === 0) {
		return [type];
	}
	return [...cuts, type.length].map((end, n) =>
		type.slice(n === 0 ? 0 : cuts[n - 1], end),
	);
};
