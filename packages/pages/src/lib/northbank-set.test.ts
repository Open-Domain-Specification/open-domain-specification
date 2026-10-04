import {
	Aggregate,
	type Consumption,
	identityKeyOf,
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { northbankSet } from "./fixtures";
import Harness from "./Page.harness.svelte";
import { pageRefs, resolvePage } from "./resolve";
import { routeOf, routeTarget } from "./route";

/**
 * NorthBank as it ships: twelve team files, read as one set. Everything here
 * is read from the live set, never from the frozen single-file original, so
 * what is proven is what a reader of the folder sees.
 */
const loaded = northbankSet();
const { set } = loaded;

describe("NorthBank read as the twelve files it is", () => {
	it("holds the twelve files in code-point order, with the contexts and relationships it has", () => {
		expect(loaded.files.map((f) => f.path)).toEqual([
			"accounts.json",
			"cards.json",
			"channels.json",
			"core_banking.json",
			"credit_risk.json",
			"customer_platform.json",
			"digital_platform.json",
			"finance_systems.json",
			"financial_crime.json",
			"lending.json",
			"payments.json",
			"scheme_connectivity.json",
		]);
		expect(loaded.excluded).toEqual([]);
		const contexts = set.workspaces.flatMap((w) => [
			...w.boundedcontexts.values(),
		]);
		expect(contexts).toHaveLength(19);
		expect(set.workspaces.flatMap((w) => w.relationships)).toHaveLength(34);
	});

	it("gives each file its own findings, the three the model means to carry, each in the file it is about", () => {
		const found = loaded.files.flatMap((f) =>
			f.diagnostics.map((d) => [f.path, d.rule, d.severity] as const),
		);
		expect(found).toEqual([
			["channels.json", "separate-ways", "error"],
			["digital_platform.json", "context-serves-subdomain", "warning"],
			["lending.json", "consumable-kind", "error"],
		]);
		// Each finding is counted once: the set's own list and the files' agree.
		expect(
			set
				.validate()
				.map((d) => `${d.file}:${d.rule}`)
				.sort(),
		).toEqual(found.map(([f, r]) => `${f}:${r}`).sort());
	});

	it("draws the context map from the set: nineteen contexts, kept apart by file", () => {
		const map = ODSContextMap.fromSet(set);
		expect(map.nodes.size).toBe(19);
		for (const id of map.nodes.keys())
			expect(id).toMatch(/^[^#]+\.json#\/boundedcontexts\//);
		// A file's own map reaches into the others by the same keys.
		const channels = ODSContextMap.fromWorkspace(
			set.byPath("channels.json") as never,
		);
		expect([...channels.nodes.keys()]).toContain(
			"customer_platform.json#/boundedcontexts/customer_&_kyc",
		);
	});

	it("draws the other three maps across the files too", () => {
		expect(ODSConsumableMap.fromSet(set).nodes.size).toBeGreaterThan(19);
		expect(ODSRelationMap.fromSet(set).nodes.size).toBeGreaterThan(0);
		expect(ODSFlowMap.fromSet(set).nodes.size).toBeGreaterThan(0);
	});

	it("routes a map node by key to the page of the file that owns it", () => {
		for (const w of set.workspaces)
			for (const bc of w.boundedcontexts.values())
				expect(routeTarget(set, routeOf(bc))).toEqual({
					kind: "workspace",
					workspace: w,
					ref: bc.ref,
				});
		const key = identityKeyOf(
			set
				.byPath("customer_platform.json")
				?.boundedcontexts.get("customer_&_kyc") as never,
		);
		expect(key).toBe("customer_platform.json#/boundedcontexts/customer_&_kyc");
	});
});

describe("every page of every NorthBank file renders, and every link on it reaches the file that owns its target", () => {
	for (const file of loaded.files) {
		const refs = pageRefs(file.workspace);
		it(`${file.path}: ${refs.length} pages`, () => {
			expect(refs.length).toBeGreaterThan(2);
			const dangling: string[] = [];
			for (const ref of refs) {
				const { container, unmount } = render(Harness, {
					model: file.model,
					ref,
				});
				expect(container.querySelector("h1")?.textContent?.trim()).toBeTruthy();
				for (const a of container.querySelectorAll<HTMLAnchorElement>(
					"a.ref[data-ref]",
				)) {
					const route = a.dataset.ref as string;
					const target = routeTarget(set, route);
					if (target.kind !== "workspace") {
						dangling.push(`${ref} -> ${route} (${target.kind})`);
						continue;
					}
					const page = resolvePage(target.workspace, target.ref);
					if (target.ref !== "#" && page.target === target.workspace)
						dangling.push(`${ref} -> ${route} (no page)`);
				}
				unmount();
			}
			expect(dangling).toEqual([]);
		});
	}
});

/** Every consumption of one file of a provider in another. */
const crossFile: Consumption[] = set.workspaces.flatMap((w) =>
	[...w.boundedcontexts.values()].flatMap((bc) =>
		[...bc.aggregates.values(), ...bc.services.values()].flatMap((m) =>
			m.consumptions.filter(
				(c) => c.consumable.provider.boundedcontext.workspace !== w,
			),
		),
	),
);

describe("what one file consumes from another", () => {
	it("is not nothing: NorthBank's files consume from each other", () => {
		expect(crossFile.length).toBeGreaterThan(10);
		expect(
			new Set(
				crossFile.map(
					(c) => c.consumable.provider.boundedcontext.workspace.file,
				),
			).size,
		).toBeGreaterThan(3);
	});

	it("is linked from the consumer's page to the consumable's own file, never to a consumable of the consumer's", () => {
		const wrong: string[] = [];
		const missing: string[] = [];
		for (const c of crossFile) {
			const consumer = c.consumer;
			const home = consumer.boundedcontext.workspace;
			const model = loaded.modelOf(home);
			const { container, unmount } = render(Harness, {
				model: model as never,
				ref: consumer.ref,
			});
			const links = [
				...container.querySelectorAll<HTMLAnchorElement>("a.ref[data-ref]"),
			].map((a) => a.dataset.ref);
			const owner = routeOf(c.consumable);
			if (!links.includes(owner))
				missing.push(
					`${consumer instanceof Aggregate ? "aggregate" : "service"} ${routeOf(consumer)} -> ${owner}`,
				);
			// The same local ref in the consumer's own file would be a different element.
			const local = `#/workspaces/${home.file}${c.consumable.ref.slice(1)}`;
			if (
				local !== owner &&
				links.includes(local) &&
				!home.getByRef(c.consumable.ref)
			)
				wrong.push(`${routeOf(consumer)} -> ${local}`);
			unmount();
		}
		expect(missing).toEqual([]);
		expect(wrong).toEqual([]);
	});

	it("opens the consumable's page in the owning file, whose own title and workspace it shows", () => {
		const [c] = crossFile;
		const target = routeTarget(set, routeOf(c.consumable));
		expect(target.kind).toBe("workspace");
		if (target.kind !== "workspace") return;
		const model = loaded.modelOf(target.workspace) as never;
		const { container, unmount } = render(Harness, { model, ref: target.ref });
		expect(container.querySelector("h1")?.textContent).toContain(
			c.consumable.name,
		);
		unmount();
	});
});
