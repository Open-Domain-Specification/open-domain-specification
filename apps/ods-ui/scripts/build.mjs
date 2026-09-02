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

writeFileSync(
	join(dist, "index.html"),
	await bootstrapHtml(pagesApp, { examples }),
);
console.log(`ods-ui: viewer copied to dist with ${examples.length} examples`);
