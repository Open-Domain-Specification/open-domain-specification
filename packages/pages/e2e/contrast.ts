/**
 * WCAG 2 contrast maths, kept free of Playwright and of the DOM so the unit
 * suite (`src/lib/static-theme.test.ts`) and the rendered spec
 * (`contrast.spec.ts`) share one definition of "4.5:1". Test-side only: the
 * product never calls it.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

/** Ordinary text (not large) needs this, at any size the pages draw. */
export const AA_TEXT = 4.5;

export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };
export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

const clamp = (n: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, n));

/** `#rgb`, `#rrggbb` or `#rrggbbaa`. */
export function hex(value: string): Rgba {
	const m = /^#([0-9a-f]{3,8})$/i.exec(value.trim());
	if (!m) throw new Error(`not a hex colour: ${value}`);
	let digits = m[1];
	if (digits.length === 3 || digits.length === 4)
		digits = [...digits].map((d) => d + d).join("");
	if (digits.length !== 6 && digits.length !== 8)
		throw new Error(`not a hex colour: ${value}`);
	const channel = (i: number) => Number.parseInt(digits.slice(i, i + 2), 16);
	return {
		r: channel(0),
		g: channel(2),
		b: channel(4),
		a: digits.length === 8 ? channel(6) / 255 : 1,
	};
}

/**
 * What `getComputedStyle` hands back for a colour: `rgb()`/`rgba()` in either
 * comma or space syntax, or `color(srgb r g b / a)` which is how Chromium
 * reports a `color-mix()` result. Anything else is a failure of the harness,
 * not a colour to guess at.
 */
export function parseColor(value: string): Rgba {
	const text = value.trim();
	if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
	if (text.startsWith("#")) return hex(text);
	const srgb = /^color\(srgb\s+([^)]+)\)$/.exec(text);
	if (srgb) {
		const [channels, alpha] = srgb[1].split("/");
		const [r, g, b] = channels.trim().split(/\s+/).map(Number);
		return {
			r: r * 255,
			g: g * 255,
			b: b * 255,
			a: alpha === undefined ? 1 : parseAlpha(alpha),
		};
	}
	const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
	if (!rgb) throw new Error(`unsupported colour: ${value}`);
	const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
	const [r, g, b] = parts.slice(0, 3).map(Number);
	return {
		r,
		g,
		b,
		a: parts[3] === undefined ? 1 : parseAlpha(parts[3]),
	};
}

function parseAlpha(value: string): number {
	const text = value.trim();
	return text.endsWith("%") ? Number.parseFloat(text) / 100 : Number(text);
}

/** `top` painted over `bottom`, with `top`'s alpha scaled by `opacity`. */
export function over(top: Rgba, bottom: Rgba, opacity = 1): Rgba {
	const a = clamp(top.a * opacity, 0, 1);
	const outA = a + bottom.a * (1 - a);
	if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };
	const mix = (t: number, b: number) => (t * a + b * bottom.a * (1 - a)) / outA;
	return {
		r: mix(top.r, bottom.r),
		g: mix(top.g, bottom.g),
		b: mix(top.b, bottom.b),
		a: outA,
	};
}

/** `color-mix(in srgb, a pct%, b)`, opaque inputs. */
export function mix(a: Rgba, pct: number, b: Rgba): Rgba {
	const w = pct / 100;
	return {
		r: a.r * w + b.r * (1 - w),
		g: a.g * w + b.g * (1 - w),
		b: a.b * w + b.b * (1 - w),
		a: 1,
	};
}

const linear = (channel: number) => {
	const c = channel / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance(c: Rgba): number {
	return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
}

/** Contrast of `fg` on an opaque `bg`; translucent `fg` is composited over it first. */
export function contrast(fg: Rgba, bg: Rgba): number {
	if (bg.a < 0.999) throw new Error("the background must be opaque");
	const painted = over(fg, bg);
	const a = luminance(painted);
	const b = luminance(bg);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** One painted layer of the page: a background colour and the opacity it sits under. */
export type Layer = { bg: string; opacity: number };

/**
 * The opaque backdrop the layers (outermost first) paint over `base`. Opacity
 * on an element fades its background and everything inside it, so each layer's
 * alpha is its own times the opacity accumulated down to it.
 */
export function backdrop(layers: Layer[], base?: Rgba): Rgba {
	let under = base ?? { ...WHITE, a: 0 };
	for (const layer of layers)
		under = over(parseColor(layer.bg), under, layer.opacity);
	if (under.a < 0.999)
		throw new Error("no opaque background found under the text");
	return under;
}

/** What one measured text element needs to be judged: its colour and what it sits on. */
export type Sample = {
	text: string;
	/** Computed `color`. */
	color: string;
	/** Product of `opacity` on the element and every ancestor. */
	textOpacity: number;
	/** Outermost first, ending at the element itself. */
	layers: Layer[];
	/** Painted over the layers' own result: a cluster stack, or a panel's worst backdrop. */
	under?: Rgba;
};

export function ratioOf(sample: Sample, base?: Rgba): number {
	const bg = backdrop(sample.layers, sample.under ?? base);
	const fg = parseColor(sample.color);
	return contrast({ ...fg, a: fg.a * sample.textOpacity }, bg);
}
