import * as assert from "node:assert/strict";
import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import {
	relationshipArrow,
	relationshipTitle,
	Workspace,
} from "@open-domain-specification/core";
import type {
	ProbedElement,
	WebviewMessage,
} from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsTestApi } from "../extension";
import { searchIndex } from "../search";
import { EXPECTED, FIXTURE_FILE } from "./fixtures/cross-surface/expected";

const EXTENSION_ID = "open-domain-specification.ods-vscode";

/**
 * The facts of epic #62 in the real VS Code webview: the same list the viewer
 * and the static export (`packages/pages/e2e/cross-surface-facts.spec.ts`) and
 * generated Markdown (`packages/doc/src/cross-surface.test.ts`) are held to.
 * Each page is opened by ref through `ods.openPage` and read through the
 * probe, which answers with the text, class, title and href of what a selector
 * matches.
 *
 * The workspace this window is opened on is `fixtures/cross-surface`; core
 * reads the same file to say what the health report's label must be.
 */
const workspace = Workspace.fromSchema(
	JSON.parse(
		readFileSync(
			path.join(
				__dirname,
				"../../src/test/fixtures/cross-surface/.ods",
				FIXTURE_FILE,
			),
			"utf8",
		),
	),
);

type Probed = Record<string, ProbedElement[]>;

const trimmed = (els: ProbedElement[] | undefined) =>
	(els ?? []).map((e) => e.text.replace(/\s+/g, " ").trim());

describe("the cross-surface facts in a real VS Code webview", function () {
	this.timeout(90_000);

	let api: OdsTestApi;
	let file: OdsTestApi["project"]["workspaces"][number];
	const answers: Extract<WebviewMessage, { type: "rendered" }>[] = [];
	let subscription: vscode.Disposable;

	before(async () => {
		const extension = vscode.extensions.getExtension<OdsTestApi>(EXTENSION_ID);
		assert.ok(extension, `extension ${EXTENSION_ID} is not installed`);
		api = await extension.activate();
		const found = api.project.workspaces.find(
			(f) => f.relativePath === FIXTURE_FILE,
		);
		assert.ok(found, `${FIXTURE_FILE} should be loaded`);
		file = found;
		subscription = api.panel.onDidReceiveWebviewMessage((msg) => {
			if (msg.type === "rendered") answers.push(msg);
		});
	});

	after(() => subscription.dispose());

	/**
	 * Opens the page at `ref`, then asks the webview until its heading names the
	 * page and `ready` holds of what the selectors matched. A page that has not
	 * rendered yet answers with nothing, so the ask repeats.
	 */
	async function read(
		ref: string,
		heading: string,
		selectors: string[],
		ready: (probed: Probed) => boolean = () => true,
		targetFile = file,
	): Promise<Probed> {
		answers.length = 0;
		await vscode.commands.executeCommand("ods.openPage", {
			file: targetFile,
			ref,
		});
		const all = ["main h1", ...selectors];
		const deadline = Date.now() + 45_000;
		for (;;) {
			api.panel.probe(all);
			await new Promise((resolve) => setTimeout(resolve, 300));
			const probed = answers.at(-1)?.probed;
			if (
				probed &&
				trimmed(probed["main h1"]).some((h) => h.includes(heading)) &&
				ready(probed)
			)
				return probed;
			assert.ok(
				Date.now() < deadline,
				`the webview never rendered ${ref}; it last said ${JSON.stringify(answers.at(-1))}`,
			);
		}
	}

	it("prints an authored description as written and marks a generated one (#43)", async () => {
		const d = EXPECTED.descriptions;
		const descriptions = ".strategic-position span.description";
		const probed = await read(
			EXPECTED.refs.orders,
			"Orders",
			[descriptions, `${descriptions} .keyword`],
			(p) => (p[descriptions]?.length ?? 0) === 2,
		);

		const [authored] = probed[descriptions].filter(
			(e) => !e.class?.split(" ").includes("generated"),
		);
		const [generated] = probed[descriptions].filter((e) =>
			e.class?.split(" ").includes("generated"),
		);
		assert.equal(authored.text, d.authored.text);
		assert.equal(
			generated.text.replace(/\s+/g, " ").trim(),
			`${d.generated.sentence} ${d.generated.keyword}`,
		);
		// Only the generated one carries the keyword, with its hover.
		const keywords = probed[`${descriptions} .keyword`];
		assert.equal(keywords.length, 1);
		assert.equal(keywords[0].text, d.generated.keyword);
		assert.equal(keywords[0].title, d.generated.title);
	});

	it("names the agreement each consumption runs under, or leaves the cell empty (#55)", async () => {
		const a = EXPECTED.agreements;
		const links = 'a[href^="#/relationships/"]';
		const hovers = ".svelte-flow title";
		const probed = await read(
			EXPECTED.refs.warehouseApi,
			"Warehouse API",
			["th", "tbody tr", links, hovers],
			(p) =>
				(p["tbody tr"]?.length ?? 0) > 0 &&
				(p[links]?.length ?? 0) >= 2 &&
				// The map lays its edges out after the page renders.
				(p[hovers] ?? []).some((h) => h.text.includes("Under the ")),
		);

		assert.ok(trimmed(probed.th).includes(a.columnHeader));
		const named = a.consumptions.filter((c) => c.agreement !== null);
		// One link per named agreement, to its page; none for the unnamed row.
		assert.deepEqual(
			probed[links].map((l) => [l.text.trim(), l.href]).sort(),
			named.map((c) => [c.agreement, c.relationship]).sort(),
		);
		const rows = trimmed(probed["tbody tr"]);
		for (const c of a.consumptions) {
			const row = rows.find((r) => r.includes(c.consumable));
			assert.ok(row, `a row for ${c.consumable}`);
			for (const other of named)
				assert.equal(
					row.includes(other.agreement as string),
					other.agreement === c.agreement,
					`${c.consumable}'s row ${c.agreement ? "names" : "does not name"} ${other.agreement}`,
				);
		}
		// The consumable map's edges say the same on hover.
		const lines = probed[hovers].flatMap((h) => h.text.split("\n"));
		assert.deepEqual(
			lines.filter((l) => l.startsWith("Under the ")).sort(),
			named.map((c) => a.edgeTitle(c.agreement as string)).sort(),
		);
	});

	it("names each named agreement on its page, in the tree and in search, as core titles it (#74)", async () => {
		const root = api.tree
			.getChildren()
			.find((n) => n.file.relativePath === FIXTURE_FILE);
		assert.ok(root, `the tree has no node for ${FIXTURE_FILE}`);
		const group = api.tree
			.getChildren(root)
			.find((n) => n.label === "Relationships");
		assert.ok(group, "the tree has no Relationships group");
		const rows = api.tree.getChildren(group);
		const hits = [...searchIndex(file)];
		const labels = new Set<string>();
		for (const n of EXPECTED.namedAgreements) {
			const relationship = workspace.relationships.find(
				(r) => r.ref === n.relationship,
			);
			assert.ok(relationship, `the fixture has no ${n.relationship}`);
			const title = relationshipTitle(relationship);
			assert.ok(title.endsWith(` · ${n.name}`), title);
			labels.add(title);

			const row = rows.find((r) => r.ref === n.relationship);
			assert.ok(row, `the tree has no row for ${n.relationship}`);
			assert.equal(api.tree.getTreeItem(row).label, title);
			const hit = hits.find((h) => h.ref === n.relationship);
			assert.ok(hit, `search has no hit for ${n.relationship}`);
			assert.ok(hit.label.endsWith(` ${title}`), hit.label);

			const heading = "main h1";
			const probed = await read(
				n.relationship,
				n.name,
				[`${heading} .name`, `${heading} .arrow`, `${heading} .agreement`],
				(p) => (p[`${heading} .agreement`]?.length ?? 0) > 0,
			);
			const [source, target] = trimmed(probed[`${heading} .name`]);
			const [arrow] = trimmed(probed[`${heading} .arrow`]);
			const [agreement] = trimmed(probed[`${heading} .agreement`]);
			assert.equal(`${source} ${arrow} ${target} ${agreement}`, title);
		}
		assert.equal(labels.size, EXPECTED.namedAgreements.length);
	});

	it("labels a relationship in the health report as core titles it, each context its own link (#44)", async () => {
		const h = EXPECTED.health;
		const cell = ".health-report td";
		const probed = await read(
			EXPECTED.refs.health,
			"",
			[`${cell} .name`, `${cell} .arrow`, `${cell} a`],
			(p) => (p[`${cell} .arrow`]?.length ?? 0) > 0,
		);
		const relationship = workspace.relationships.find(
			(r) => r.source.name === h.source.name && r.target.name === h.target.name,
		);
		assert.ok(relationship);
		const [source, target] = trimmed(probed[`${cell} .name`]);
		const [arrow] = trimmed(probed[`${cell} .arrow`]);
		assert.equal(arrow, relationshipArrow(relationship.type));
		assert.equal(
			`${source} ${arrow} ${target}`,
			relationshipTitle(relationship),
		);
		assert.deepEqual(
			probed[`${cell} a`].map((l) => [l.text.trim(), l.href]),
			[
				[h.source.name, h.source.ref],
				[h.target.name, h.target.ref],
			],
		);
	});

	it("draws each identity target on the relation map as the kind of context it is (#56)", async () => {
		const stereotypes = ".relation-node .stereotype";
		const names = ".relation-node strong";
		const probed = await read(
			EXPECTED.refs.account,
			"Customer Account",
			[stereotypes, names],
			(p) =>
				(p[names]?.length ?? 0) > 0 &&
				(p[names]?.length ?? 0) === (p[stereotypes]?.length ?? -1),
		);
		const kinds = trimmed(probed[stereotypes]);
		const contexts = trimmed(probed[names]);
		for (const i of EXPECTED.identities) {
			const at = contexts.indexOf(i.context);
			assert.ok(at >= 0, `${i.context} is on the map`);
			assert.equal(kinds[at], `«${i.stereotype}»`);
		}
	});

	it("keeps duplicate refusal diagnostics and renders their authored rows in the real webview", async () => {
		const workspace = new Workspace("Duplicate refusal acceptance", {
			description: "Two authored refusals of one schema.",
			version: "test",
		});
		const context = workspace.addBoundedContext("Payments", {
			description: "",
		});
		const declined = context.addSchema("Declined", { description: "" });
		declined.addAttribute("code", { type: "string" });
		const aggregate = context.addAggregate("Ledger", {
			description: "",
		});
		const root = aggregate.addRootEntity("Charge Record", {
			description: "",
		});
		root.addAttribute("id", { type: "string", identity: true });
		const operation = aggregate.provides("Charge", {
			description: "Declines a charge with a reason.",
			type: "operation",
			rejects: [
				{ schema: declined, reasons: ["late", "late"] },
				{ schema: declined, many: true, reasons: ["late", "unknown"] },
			],
		});
		const schema = workspace.toSchema();
		const boundedContext = Object.values(schema.boundedcontexts)[0];
		const aggregateSchema = Object.values(boundedContext.aggregates ?? {})[0];
		const operationSchema = Object.values(aggregateSchema.provides ?? {}).find(
			(consumable) => consumable.name === "Charge",
		);
		const originalRejections = operationSchema?.rejects;
		assert.deepEqual(JSON.parse(JSON.stringify(originalRejections)), [
			{ $ref: declined.ref, reasons: ["late", "late"] },
			{
				$ref: declined.ref,
				many: true,
				reasons: ["late", "unknown"],
			},
		]);

		const folder = path.join(
			__dirname,
			"../../src/test/fixtures/cross-surface/.ods",
		);
		const relativePath = `duplicate-refusals-${Date.now()}.json`;
		const uri = vscode.Uri.file(path.join(folder, relativePath));
		const sourceText = `${JSON.stringify({ $schema: "./schema.json", ...workspace.toSchema() }, null, 2)}\n`;
		await fs.writeFile(uri.fsPath, sourceText, "utf8");
		try {
			await api.project.reload();
			const loaded = api.project.workspaces.find(
				(candidate) => candidate.relativePath === relativePath,
			);
			assert.ok(
				loaded?.workspace,
				"the extension loads the temporary workspace",
			);
			const loadedSchema = loaded.workspace.toSchema();
			const loadedContext = Object.values(loadedSchema.boundedcontexts)[0];
			const loadedAggregate = Object.values(loadedContext.aggregates ?? {})[0];
			const loadedCharge = Object.values(loadedAggregate.provides ?? {}).find(
				(consumable) => consumable.name === "Charge",
			);
			assert.deepEqual(JSON.parse(JSON.stringify(loadedCharge?.rejects)), [
				{ $ref: declined.ref, reasons: ["late", "late"] },
				{
					$ref: declined.ref,
					many: true,
					reasons: ["late", "unknown"],
				},
			]);
			const diagnostics = loaded.workspace
				.validate()
				.filter((diagnostic) => diagnostic.rule === "rejects-duplicate");
			assert.ok(
				diagnostics.length > 0,
				"the extension model reports duplicates",
			);
			assert.ok(
				diagnostics.every((diagnostic) => diagnostic.ref === operation.ref),
				"duplicate diagnostics belong to Charge",
			);
			const problems = vscode.languages.getDiagnostics(uri);
			const chargeLine = sourceText
				.split("\n")
				.findIndex((line) => line.includes(`"${operation.id}": {`));
			assert.ok(
				problems.some(
					(diagnostic) =>
						diagnostic.source === "ods" &&
						String(diagnostic.code) === "rejects-duplicate" &&
						diagnostic.range.start.line === chargeLine,
				),
				"the extension publishes rejects-duplicate on Charge in the Problems collection",
			);

			const loadedFile = loaded as OdsTestApi["project"]["workspaces"][number];
			const overview = await read(
				"#/boundedcontexts/payments/aggregates/ledger",
				"Ledger",
				["#behaviour .subsection .rejection"],
				(p) => (p["#behaviour .subsection .rejection"]?.length ?? 0) === 2,
				loadedFile,
			);
			assert.deepEqual(
				trimmed(overview["#behaviour .subsection .rejection"]),
				["Declined", "many Declined"],
				"the operation overview retains both refusal declarations and the many marker",
			);

			const detail = await read(
				operation.ref,
				"Charge",
				[
					".page-header .rejection",
					"#rejects .subsection h3",
					"#rejects .reasons .keyword",
				],
				(p) =>
					(p[".page-header .rejection"]?.length ?? 0) === 2 &&
					(p["#rejects .subsection h3"]?.length ?? 0) === 2,
				loadedFile,
			);
			assert.equal(detail["#rejects .reasons .keyword"].length, 4);
			assert.deepEqual(trimmed(detail["#rejects .reasons .keyword"]), [
				"late",
				"late",
				"late",
				"unknown",
			]);
		} finally {
			await fs.rm(uri.fsPath, { force: true });
			await api.project.reload();
		}
	});
});
