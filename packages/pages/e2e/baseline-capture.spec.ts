import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { watchForProblems } from "./helpers";

/**
 * The baseline capture harness for issue #53 (docs/design/baseline/inventory.md).
 *
 * It is a recording tool, not a test: it visits every inventory ref on the
 * viewer and the static export, in every theme and viewport of the matrix,
 * screenshots each and writes a manifest beside the PNGs. It asserts nothing
 * about what it sees, so a page that overflows or logs an error is a row in
 * the manifest and the lead decides whether it is a finding.
 *
 * Gated behind ODS_BASELINE=1 so the normal suite and the landing gate skip
 * it. It starts its own server (ODS_BASELINE_PORT, default 4194), so run it
 * with a config that has no webServer or globalSetup, for example:
 *
 *   // /tmp/baseline.config.ts (throwaway)
 *   export default { testDir: "<abs>/packages/pages/e2e",
 *     testMatch: "baseline-capture.spec.ts", timeout: 900_000, workers: 1,
 *     reporter: [["list"]], projects: [{ name: "chromium" }] };
 *   ODS_BASELINE=1 npx playwright test -c /tmp/baseline.config.ts
 *
 * The app must be built first (`npm run build` in packages/pages), since the
 * viewer is `app/` and the export is `exportSite` over it.
 *
 * Output: docs/design/audit/<commit>/<host>/<viewport>/<theme>/<id>.png
 * (git-ignored) and docs/design/audit/<commit>/manifest.json (not ignored).
 *
 * Env: ODS_BASELINE_AXE=0 skips the axe scan; ODS_BASELINE_ONLY=<substring>
 * keeps only the ids that contain it (for a quick smoke run).
 */

const ENABLED = process.env.ODS_BASELINE === "1";
const PORT = Number(process.env.ODS_BASELINE_PORT ?? 4194);
const AXE = process.env.ODS_BASELINE_AXE !== "0";
const ONLY = process.env.ODS_BASELINE_ONLY;
const ROOT = join(__dirname, "../../..");
const APP_DIR = join(__dirname, "../app");

type ModelName = "petstore" | "rivermart" | "streamline" | "northbank";

/** One page family, exercised by one concrete ref on one reference model. */
type PageCase = { id: string; family: string; model: ModelName; ref: string };

const NB = "northbank" as const;
const KYC = "#/boundedcontexts/customer_&_kyc";

/** Keep in step with the table in docs/design/baseline/inventory.md. */
const PAGES: PageCase[] = [
	{ id: "workspace", family: "Workspace", model: NB, ref: "#" },
	{ id: "health", family: "Health", model: NB, ref: "#/health" },
	{
		id: "team",
		family: "Team",
		model: NB,
		ref: "#/teams/customer_platform_team",
	},
	{ id: "domain", family: "Domain", model: NB, ref: "#/domains/customer" },
	{
		id: "subdomain",
		family: "Subdomain",
		model: NB,
		ref: "#/domains/banking_products/subdomains/ledger",
	},
	{ id: "context", family: "BoundedContext", model: NB, ref: KYC },
	{
		id: "relationship",
		family: "ContextRelationship",
		model: NB,
		ref: "#/relationships/customer_&_kyc~upstream-downstream~accounts",
	},
	{
		id: "aggregate",
		family: "Aggregate",
		model: NB,
		ref: "#/boundedcontexts/ledger/aggregates/journal_entry",
	},
	{
		id: "entity",
		family: "Entity",
		model: NB,
		ref: `${KYC}/aggregates/customer/entities/identity_document`,
	},
	{
		id: "valueobject",
		family: "ValueObject",
		model: NB,
		ref: `${KYC}/valueobjects/address`,
	},
	{
		id: "invariant-aggregate",
		family: "Invariant",
		model: NB,
		ref: `${KYC}/aggregates/customer/invariants/adult_only`,
	},
	{
		id: "invariant-valueobject",
		family: "Invariant",
		model: NB,
		ref: "#/boundedcontexts/cards/valueobjects/pan/invariants/pan_luhn_valid",
	},
	{
		id: "invariant-context",
		family: "Invariant",
		model: NB,
		ref: "#/boundedcontexts/payments_hub/invariants/daily_limit",
	},
	{
		id: "consumable-aggregate",
		family: "Consumable",
		model: NB,
		ref: `${KYC}/aggregates/customer/provides/customer_verified`,
	},
	{
		id: "consumable-service",
		family: "Consumable",
		model: NB,
		ref: `${KYC}/services/onboarding_app/provides/start_onboarding`,
	},
	{
		id: "service",
		family: "Service",
		model: NB,
		ref: `${KYC}/services/onboarding_app`,
	},
	{
		id: "schema",
		family: "DataSchema",
		model: NB,
		ref: `${KYC}/schemas/customer_verified`,
	},
	{
		id: "policy",
		family: "Policy",
		model: NB,
		ref: "#/boundedcontexts/accounts/policies/freeze_on_fraud_case",
	},
	{
		id: "process",
		family: "Process",
		model: NB,
		ref: "#/boundedcontexts/payments_hub/processes/instruction_lifecycle",
	},
	{
		id: "term",
		family: "GlossaryTerm",
		model: NB,
		ref: "#/boundedcontexts/ledger/glossary/posting",
	},
	// The other reference models: a different shape of map and a plainer page.
	{
		id: "workspace-petstore",
		family: "Workspace",
		model: "petstore",
		ref: "#",
	},
	{
		id: "context-petstore",
		family: "BoundedContext",
		model: "petstore",
		ref: "#/boundedcontexts/sales_bc",
	},
	{
		id: "workspace-rivermart",
		family: "Workspace",
		model: "rivermart",
		ref: "#",
	},
	{
		id: "workspace-streamline",
		family: "Workspace",
		model: "streamline",
		ref: "#",
	},
];

type Host = "viewer" | "export-http" | "export-file";
type Theme = "light" | "dark";
type Viewport = { name: string; width: number; height: number };

/**
 * Justified in the inventory: desktop with the tree open (1300x900, where the
 * strategic table's card 42 is judged), under the 900px table tier and the
 * layout's one-column breakpoint, a phone, and the editor-tab size the modal
 * spec reads a relationship at.
 */
const VIEWPORTS: Viewport[] = [
	{ name: "desktop-1300x900", width: 1300, height: 900 },
	{ name: "narrow-800x900", width: 800, height: 900 },
	{ name: "phone-390x844", width: 390, height: 844 },
	{ name: "editor-tab-1150x700", width: 1150, height: 700 },
];
const THEMES: Theme[] = ["light", "dark"];

/** Which cells of hosts x viewports the harness takes (the inventory matrix). */
function viewportsFor(host: Host, c: { id: string }): Viewport[] {
	if (host === "export-file")
		return VIEWPORTS.filter((v) => v.name.startsWith("desktop"));
	// The editor tab size is only asked of the two pages read there.
	return VIEWPORTS.filter(
		(v) =>
			!v.name.startsWith("editor-tab") ||
			c.id === "context" ||
			c.id === "relationship",
	);
}

type Finding = {
	id: string;
	impact: string | null;
	nodes: number;
	help: string;
};
type Entry = {
	kind: "page" | "state";
	id: string;
	family: string;
	model: string;
	ref: string | null;
	host: Host;
	theme: Theme;
	viewport: string;
	file: string | null;
	status: "captured" | `failed: ${string}`;
	overflowX: number | null;
	consoleErrors: string[];
	axe: Finding[] | null;
};

const entries: Entry[] = [];
let commit = "unknown";
let dirty = false;
let outDir = "";
let exportDir = "";
let server: Server | undefined;

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".svg": "image/svg+xml",
	".ttf": "font/ttf",
	".woff2": "font/woff2",
};

/** `/viewer/*` is the built app, `/export/*` the exports, like two hosts on one port. */
function serve(port: number): Promise<Server> {
	const s = createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://x");
		const path = decodeURIComponent(url.pathname);
		const [base, rest] = path.startsWith("/viewer/")
			? [APP_DIR, path.slice("/viewer/".length)]
			: path.startsWith("/export/")
				? [exportDir, path.slice("/export/".length)]
				: ["", ""];
		let file = base ? normalize(join(base, rest)) : "";
		if (file && existsSync(file) && statSync(file).isDirectory())
			file = join(file, "index.html");
		if (!file || !file.startsWith(normalize(base)) || !existsSync(file)) {
			res.writeHead(404).end();
			return;
		}
		res.writeHead(200, {
			"content-type": MIME[extname(file)] ?? "application/octet-stream",
		});
		createReadStream(file).pipe(res);
	});
	return new Promise((resolve) => s.listen(port, () => resolve(s)));
}

const modelJson = (m: ModelName) =>
	JSON.parse(readFileSync(join(ROOT, `models/${m}/.ods/${m}.json`), "utf8"));
const origin = `http://localhost:${PORT}`;
const fakeUrl = (m: ModelName) => `https://workspaces.test/.ods/${m}.json`;

async function exportModels(): Promise<void> {
	const models = [...new Set(PAGES.map((p) => p.model))];
	for (const m of models) {
		const ws = Workspace.fromSchema(modelJson(m));
		await exportSite({
			appDir: APP_DIR,
			sources: [
				{
					workspace: ws,
					fileLabel: `${m}.json`,
					diagnostics: ws.validate(),
				},
			],
			outDir: join(exportDir, m),
		});
	}
	// Two workspaces, so the picker (the export's own global surface) exists.
	const a = Workspace.fromSchema(modelJson("petstore"));
	const b = Workspace.fromSchema({
		...modelJson("petstore"),
		id: "second",
		name: "Second Workspace",
	});
	await exportSite({
		appDir: APP_DIR,
		sources: [
			{ workspace: a, fileLabel: "petstore.json", diagnostics: a.validate() },
			{ workspace: b, fileLabel: "second.json", diagnostics: [] },
		],
		outDir: join(exportDir, "picker"),
	});
}

async function serveModels(page: Page): Promise<void> {
	for (const m of [
		"petstore",
		"rivermart",
		"streamline",
		"northbank",
	] as const) {
		await page.route(`**/${m}.json`, (route) =>
			route.fulfill({
				status: 200,
				headers: {
					"content-type": "application/json",
					"access-control-allow-origin": "*",
				},
				body: JSON.stringify(modelJson(m)),
			}),
		);
	}
}

function urlFor(host: Host, model: ModelName, ref: string): string {
	if (host === "viewer")
		return `${origin}/viewer/?url=${encodeURIComponent(fakeUrl(model))}${ref === "#" ? "" : ref}`;
	if (host === "export-http")
		return `${origin}/export/${model}/${ref === "#" ? "" : ref}`;
	const file = pathToFileURL(join(exportDir, model, "index.html")).href;
	return `${file}${ref === "#" ? "" : ref}`;
}

/** The page is settled when its title is up and any diagram has laid out its nodes. */
async function settle(page: Page): Promise<void> {
	await page.locator("main h1").first().waitFor({ timeout: 15_000 });
	if (await page.locator("figure.diagram").count())
		await page
			.locator("figure.diagram .svelte-flow__node")
			.first()
			.waitFor({ timeout: 10_000 })
			.catch(() => undefined);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(500);
}

async function measure(page: Page) {
	const overflowX = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	const axe = AXE
		? (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
				id: v.id,
				impact: v.impact ?? null,
				nodes: v.nodes.length,
				help: v.help,
			}))
		: null;
	return { overflowX, axe };
}

async function record(
	page: Page,
	problems: string[],
	meta: Omit<Entry, "file" | "status" | "overflowX" | "consoleErrors" | "axe">,
	settleFirst = true,
	fullPage = true,
): Promise<void> {
	const rel = join(meta.host, meta.viewport, meta.theme, `${meta.id}.png`);
	const entry: Entry = {
		...meta,
		file: rel,
		status: "captured",
		overflowX: null,
		consoleErrors: [],
		axe: null,
	};
	try {
		if (settleFirst) await settle(page);
		await mkdir(join(outDir, meta.host, meta.viewport, meta.theme), {
			recursive: true,
		});
		await page.screenshot({ path: join(outDir, rel), fullPage });
		Object.assign(entry, await measure(page));
	} catch (e) {
		entry.status = `failed: ${(e as Error).message.split("\n")[0]}`;
		entry.file = null;
	}
	entry.consoleErrors = problems.splice(0).slice(0, 8);
	entries.push(entry);
}

const wanted = (id: string) => !ONLY || id.includes(ONLY);

const describe = ENABLED ? test.describe : test.describe.skip;

describe("baseline capture (ODS_BASELINE=1)", () => {
	test.describe.configure({ mode: "serial" });

	test.beforeAll(async () => {
		commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
			cwd: ROOT,
		})
			.toString()
			.trim();
		dirty =
			execFileSync("git", ["status", "--porcelain", "--", "packages", "apps"], {
				cwd: ROOT,
			})
				.toString()
				.trim().length > 0;
		outDir = join(ROOT, "docs/design/audit", commit);
		await rm(outDir, { recursive: true, force: true });
		await mkdir(outDir, { recursive: true });
		exportDir = await mkdtemp(join(tmpdir(), "ods-baseline-"));
		await exportModels();
		server = await serve(PORT);
	});

	test.afterAll(async () => {
		await new Promise((r) => (server ? server.close(r) : r(undefined)));
		if (exportDir) await rm(exportDir, { recursive: true, force: true });
		const pages = entries.filter((e) => e.kind === "page");
		const axeRules: Record<string, number> = {};
		for (const e of entries)
			for (const v of e.axe ?? []) axeRules[v.id] = (axeRules[v.id] ?? 0) + 1;
		await writeFile(
			join(outDir, "manifest.json"),
			`${JSON.stringify(
				{
					commit,
					dirtyWorkingTree: dirty,
					generatedAt: new Date().toISOString(),
					axe: AXE,
					summary: {
						shots: entries.filter((e) => e.file).length,
						failed: entries.filter((e) => !e.file).length,
						pagesWithOverflow: pages.filter((e) => (e.overflowX ?? 0) > 0)
							.length,
						entriesWithConsoleErrors: entries.filter(
							(e) => e.consoleErrors.length,
						).length,
						axeViolatingEntriesByRule: axeRules,
					},
					entries,
				},
				null,
				"\t",
			)}\n`,
		);
	});

	// Every page family, host by host, theme by theme, viewport by viewport.
	for (const host of ["viewer", "export-http", "export-file"] as Host[]) {
		for (const theme of THEMES) {
			for (const vp of VIEWPORTS) {
				const cases = PAGES.filter(
					(c) =>
						wanted(c.id) &&
						viewportsFor(host, c).some((v) => v.name === vp.name),
				);
				if (!cases.length) continue;
				test(`pages: ${host} ${theme} ${vp.name}`, async ({ browser }) => {
					test.setTimeout(900_000);
					const context = await browser.newContext({
						viewport: { width: vp.width, height: vp.height },
						colorScheme: theme,
						deviceScaleFactor: 1,
					});
					const page = await context.newPage();
					const problems = watchForProblems(page);
					await serveModels(page);
					for (const c of cases) {
						await page.goto(urlFor(host, c.model, c.ref));
						await record(page, problems, {
							kind: "page",
							id: c.id,
							family: c.family,
							model: c.model,
							ref: c.ref,
							host,
							theme,
							viewport: vp.name,
						});
					}
					await context.close();
					expect(true).toBe(true);
				});
			}
		}
	}

	// Global surfaces and interaction states, at desktop (and phone for import).
	for (const theme of THEMES) {
		test(`states: ${theme}`, async ({ browser }) => {
			test.setTimeout(900_000);
			const states: {
				id: string;
				family: string;
				host: Host;
				vp: Viewport;
				run: (page: Page) => Promise<void>;
				open?: string;
				settle?: boolean;
				fullPage?: boolean;
			}[] = [];
			const desktop = VIEWPORTS[0];
			const phone = VIEWPORTS[2];
			for (const vp of [desktop, phone])
				states.push({
					id: "import-empty",
					family: "Import screen",
					host: "viewer",
					vp,
					open: `${origin}/viewer/`,
					settle: false,
					run: async (p) => {
						await p
							.getByRole("heading", { name: "Open a workspace" })
							.waitFor();
						await p.waitForTimeout(300);
					},
				});
			states.push({
				id: "import-error",
				family: "Import screen",
				host: "viewer",
				vp: desktop,
				open: `${origin}/viewer/`,
				settle: false,
				run: async (p) => {
					await p.route("**/missing.json", (r) => r.fulfill({ status: 404 }));
					await p
						.getByLabel("From a URL")
						.fill("https://workspaces.test/missing.json");
					await p.getByRole("button", { name: "Load" }).click();
					await p.locator("p.error").waitFor();
				},
			});
			states.push({
				id: "import-loading",
				family: "Import screen",
				host: "viewer",
				vp: desktop,
				open: `${origin}/viewer/`,
				settle: false,
				run: async (p) => {
					// Held open so the loading state is what is on screen.
					await p.route("**/slow.json", () => new Promise(() => undefined));
					await p
						.getByLabel("From a URL")
						.fill("https://workspaces.test/slow.json");
					await p.getByRole("button", { name: "Load" }).click();
					await p.getByRole("button", { name: "Loading…" }).waitFor();
				},
			});
			states.push({
				id: "export-picker",
				family: "Workspace picker",
				host: "export-http",
				vp: desktop,
				open: `${origin}/export/picker/`,
				settle: false,
				run: async (p) => {
					await p.locator("ul.site-index li").first().waitFor();
				},
			});
			// The interaction states on the richest pages, viewer and export alike.
			for (const host of ["viewer", "export-http"] as Host[]) {
				const at = (m: ModelName, ref: string) => urlFor(host, m, ref);
				states.push({
					id: "modal-relationship-evidence",
					family: "Modal (strategic table row)",
					host,
					vp: desktop,
					// The one context with a relationship marked for refactoring, so its
					// strategic table carries the evidence toggles.
					open: at(NB, "#/boundedcontexts/branch_&_contact_centre"),
					run: async (p) => {
						await p
							.locator("button[aria-controls=relationship-modal]")
							.first()
							.click();
						await p.getByRole("dialog").waitFor();
						await p.waitForTimeout(300);
					},
					fullPage: false,
				});
				states.push({
					id: "hover-pattern",
					family: "Hover (pattern keyword)",
					host,
					vp: desktop,
					open: at(NB, KYC),
					run: async (p) => {
						await p.locator(".pattern-hover .trigger").first().focus();
						await p
							.locator("[role=tooltip]")
							.first()
							.waitFor({ timeout: 3000 });
					},
					fullPage: false,
				});
				states.push({
					id: "diagram-fullscreen",
					family: "Fullscreen diagram",
					host,
					vp: desktop,
					open: at(NB, "#"),
					run: async (p) => {
						await p
							.getByRole("button", { name: "Enter fullscreen" })
							.first()
							.click();
						await p.getByRole("button", { name: "Exit fullscreen" }).waitFor();
						await p.waitForTimeout(600);
					},
					fullPage: false,
				});
				states.push({
					id: "keyboard-focus",
					family: "Keyboard focus (first Tab stops)",
					host,
					vp: desktop,
					open: at(NB, KYC),
					run: async (p) => {
						for (let i = 0; i < 3; i++) await p.keyboard.press("Tab");
					},
					fullPage: false,
				});
			}

			for (const s of states) {
				if (!wanted(s.id)) continue;
				const context = await browser.newContext({
					viewport: { width: s.vp.width, height: s.vp.height },
					colorScheme: theme,
					deviceScaleFactor: 1,
				});
				const page = await context.newPage();
				// A state that cannot be reached is a manifest row, not a hang.
				page.setDefaultTimeout(8000);
				const problems = watchForProblems(page);
				await serveModels(page);
				let failure: string | undefined;
				try {
					await page.goto(s.open ?? "about:blank");
					if (s.settle !== false) await settle(page);
					await s.run(page);
				} catch (e) {
					failure = (e as Error).message.split("\n")[0];
				}
				await record(
					page,
					problems,
					{
						kind: "state",
						id: s.id,
						family: s.family,
						model: s.open?.includes("/picker/") ? "petstore+second" : NB,
						ref: null,
						host: s.host,
						theme,
						viewport: s.vp.name,
					},
					false,
					s.fullPage ?? true,
				);
				const entry = entries[entries.length - 1];
				if (failure) {
					entry.status = `failed: ${failure}`;
				}
				await page.unrouteAll({ behavior: "ignoreErrors" });
				await context.close();
			}
			expect(true).toBe(true);
		});
	}
});
