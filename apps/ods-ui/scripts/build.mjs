import {
	cpSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapHtml } from "@open-domain-specification/pages/site";

// The viewer is the pages package's Vite app (the same bundle the static
// export and the extension webview use). This app owns its deployable copy so
// the host publishes apps/ods-ui/dist and never reaches into a library package.
// The reference models ship beside it as examples the import screen offers.
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const pagesApp = join(pkgDir("@open-domain-specification/pages"), "app");
const dist = join(here, "../dist");

const FAVICON = join(here, "../../../media/favicon");
const FAVICON_LINKS = `
	<link rel="icon" type="image/png" href="./favicon-96x96.png" sizes="96x96" />
	<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
	<link rel="shortcut icon" href="./favicon.ico" />
	<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png" />
	<meta name="apple-mobile-web-app-title" content="ODS" />
	<link rel="manifest" href="./site.webmanifest" />`;

const MODELS = ["petstore", "streamline", "northbank", "rivermart"];

rmSync(dist, { recursive: true, force: true });
cpSync(pagesApp, dist, { recursive: true });
mkdirSync(join(dist, "examples"));

/** The leading words every name shares: "NorthBank" for "NorthBank Accounts", "NorthBank Cards"... */
const commonWords = (names) => {
	const split = names.map((n) => n.split(" "));
	const out = [];
	for (
		let i = 0;
		split.every((w) => w[i] !== undefined && w[i] === split[0][i]);
		i++
	)
		out.push(split[0][i]);
	return out.join(" ");
};

// A model is one workspace file or a set of them (NorthBank is twelve, one per
// team). Every workspace file of a model is copied, in code-point order of its
// name; the first of them never stands in for the rest. A set's example names
// each file as an entry, because no one file refers to all the others.
const examples = MODELS.map((model) => {
	const pkg = pkgDir(`@open-domain-specification/model-${model}`);
	const ods = join(pkg, ".ods");
	const names = readdirSync(ods)
		.filter((f) => f.endsWith(".json") && f !== "schema.json")
		.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	if (names.length === 0)
		throw new Error(`${model}: no workspace file in ${ods}`);
	const schemas = names.map((f) =>
		JSON.parse(readFileSync(join(ods, f), "utf8")),
	);
	if (names.length === 1) {
		cpSync(join(ods, names[0]), join(dist, "examples", names[0]));
		return {
			name: schemas[0].name,
			description: schemas[0].description,
			url: `./examples/${names[0]}`,
			color: schemas[0].primaryColor,
		};
	}
	const folder = join(dist, "examples", model);
	mkdirSync(folder, { recursive: true });
	for (const f of names) cpSync(join(ods, f), join(folder, f));
	const urls = names.map((f) => `./examples/${model}/${f}`);
	return {
		name: commonWords(schemas.map((x) => x.name)) || model,
		description: JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"))
			.description,
		url: urls[0],
		urls,
		root: `./examples/${model}/`,
		color: schemas[0].primaryColor,
	};
});

cpSync(FAVICON, dist, { recursive: true });
const html = (await bootstrapHtml(pagesApp, { examples }))
	// The bundle's single svg icon gives way to the full set.
	.replace(/\n\t<link rel="icon"[^\n]*\n/, "\n")
	.replace("</head>", `${FAVICON_LINKS}\n</head>`);
writeFileSync(join(dist, "index.html"), html);
const files = examples.reduce((n, e) => n + (e.urls?.length ?? 1), 0);
console.log(
	`ods-ui: viewer copied to dist with ${examples.length} examples (${files} workspace files)`,
);
