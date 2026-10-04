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

const examples = MODELS.map((model) => {
	const ods = join(pkgDir(`@open-domain-specification/model-${model}`), ".ods");
	const file = readdirSync(ods).find(
		(f) => f.endsWith(".json") && f !== "schema.json",
	);
	if (!file) throw new Error(`${model}: no workspace file in ${ods}`);
	const schema = JSON.parse(readFileSync(join(ods, file), "utf8"));
	cpSync(join(ods, file), join(dist, "examples", file));
	return {
		name: schema.name,
		description: schema.description,
		url: `./examples/${file}`,
		color: schema.primaryColor,
	};
});

cpSync(FAVICON, dist, { recursive: true });
const html = (await bootstrapHtml(pagesApp, { examples }))
	// The bundle's single svg icon gives way to the full set.
	.replace(/\n\t<link rel="icon"[^\n]*\n/, "\n")
	.replace("</head>", `${FAVICON_LINKS}\n</head>`);
writeFileSync(join(dist, "index.html"), html);
console.log(`ods-ui: viewer copied to dist with ${examples.length} examples`);
