import { describe, expect, it } from "vitest";
import { encodeWirePath, relativeWirePath, type SetPath } from "./path-codec";
import { REF_KINDS } from "./ref-kinds";
import type { WorkspaceSchema } from "./schema";
import { type Workspace, Workspace as WorkspaceModel } from "./workspace";
import { setKeyOf, WorkspaceSet } from "./workspace-set";

/**
 * Ids that need both layers of escaping: `/` and `~` in the pointer, `#` and
 * `%` which stay raw in the pointer but are encoded in a file path.
 */
const CONTEXT = "led/ger~#%";
const SERVICE = "pay/ments~";
const OPERATION = "po/st#%";
const SCHEMA = "dec~line%";

/** File names a host may hold: a space, `#` and `%`, non-ASCII, a raw `%41`, nested folders. */
const PATHS: SetPath[] = [
	"my team.json",
	"a#%.json",
	"ü/é.json",
	"a%41.json",
	"a/team.json",
	"b/team.json",
];

/** One complete file whose every element carries an awkward id. */
function awkward(index: number) {
	const ws = new WorkspaceModel(`Team ${index}`, {
		description: "",
		version: "test",
	});
	const sub = ws
		.addDomain("Bank", { description: "" })
		.addSubdomain("Core", { type: "core", description: "" });
	const context = ws.addBoundedContext("Ledger", {
		id: CONTEXT,
		description: "",
		subdomains: [sub],
	});
	const schema = context.addSchema("Decline", { id: SCHEMA });
	const service = context.addService("Payments", {
		id: SERVICE,
		description: "",
		type: "application",
	});
	const post = service.provides("Post", {
		id: OPERATION,
		description: "",
		type: "operation",
		rejects: [schema],
	});
	return { ws, context, schema, service, post };
}

/** Every file consumes the next file's operation, and the last the first's: a cycle of files. */
function ringOfFiles() {
	const files = PATHS.map((_, i) => awkward(i));
	const links = files.map((from, i) => {
		const to = files[(i + 1) % files.length];
		from.context.upstreamOf(to.context, {
			upstreamRoles: [],
			downstreamRoles: [],
		});
		const consumption = to.service.consumes(from.post, {});
		// The next file refuses with this file's schema, and this file's policy
		// waits for that refusal: an answer whose ref names a file of its own.
		const crossing = to.service.provides(`Cross ${i}`, {
			description: "",
			type: "operation",
			rejects: [from.schema],
		});
		const answer = crossing.rejected(from.schema);
		const policy = from.context.addPolicy("Await", { description: "" });
		policy.on(answer);
		return { consumption, crossing, answer, policy };
	});
	const set = WorkspaceSet.fromWorkspaces(
		files.map((it, i) => [PATHS[i], it.ws]),
	);
	return { files, links, set };
}

const dump = (set: WorkspaceSet): Array<[string, WorkspaceSchema]> =>
	[...set.toSchemas()].map(([file, schema]) => [
		file,
		JSON.parse(JSON.stringify(schema)),
	]);

describe("a full valid canonical set with awkward file names and ids", () => {
	it("dumps, loads and dumps again to the same text", () => {
		const { set } = ringOfFiles();
		const first = dump(set);
		const text = JSON.stringify(first);
		const loaded = WorkspaceSet.fromSchemas(JSON.parse(text));
		const again = dump(loaded);
		expect(JSON.stringify(again)).toBe(text);
		expect(JSON.stringify(dump(WorkspaceSet.fromSchemas(again)))).toBe(text);
		expect(loaded.rejected).toEqual([]);
		expect(
			loaded.validate().filter((d) => d.rule === "unresolved-ref"),
		).toEqual([]);
	});

	it("writes each file by the relative, percent-encoded wire path of the file it names", () => {
		const { set } = ringOfFiles();
		const files = new Map(dump(set));
		// The second file consumes the first file's operation: from `a#%.json`
		// back to `my team.json`, in the same folder.
		const consumes =
			files.get("a#%.json")?.boundedcontexts[CONTEXT].services?.[SERVICE]
				.consumes;
		expect(consumes?.[0].consumable.$ref).toBe(
			`my%20team.json#/boundedcontexts/led~1ger~0#%/services/pay~1ments~0/provides/po~1st#%`,
		);
		// From `ü/é.json` to `a%41.json`: up out of the folder, and `%41` is a
		// literal percent sign and a four and a one, never an `A`.
		const fromFolder =
			files.get("a%41.json")?.boundedcontexts[CONTEXT].services?.[SERVICE]
				.consumes?.[0].consumable.$ref;
		expect(fromFolder).toBe(
			`%C3%BC/%C3%A9.json#/boundedcontexts/led~1ger~0#%/services/pay~1ments~0/provides/po~1st#%`,
		);
		// The nested pair, in both directions, which is a cycle between folders.
		expect(
			files.get("b/team.json")?.boundedcontexts[CONTEXT].services?.[SERVICE]
				.consumes?.[0].consumable.$ref,
		).toBe(
			`../a/team.json#/boundedcontexts/led~1ger~0#%/services/pay~1ments~0/provides/po~1st#%`,
		);
		expect(
			files.get("my team.json")?.boundedcontexts[CONTEXT].services?.[SERVICE]
				.consumes?.[0].consumable.$ref,
		).toBe(
			`b/team.json#/boundedcontexts/led~1ger~0#%/services/pay~1ments~0/provides/po~1st#%`,
		);
		expect(relativeWirePath("a/team.json", "b/team.json")).toBe(
			"../b/team.json",
		);
	});

	it("keys each element by its file and its own pointer, whatever else is in the set", () => {
		const { set } = ringOfFiles();
		const loaded = WorkspaceSet.fromSchemas(dump(set));
		for (const file of PATHS) {
			const workspace = loaded.byPath(file) as Workspace;
			const context = workspace.getBoundedContextByRefOrThrow(
				"#/boundedcontexts/led~1ger~0#%",
			);
			expect(setKeyOf(context)).toBe(
				`${encodeWirePath(file)}#/boundedcontexts/led~1ger~0#%`,
			);
		}
		// Taking files away does not change the key of one that stays.
		const keyIn = (s: WorkspaceSet) =>
			setKeyOf(
				(s.byPath("a#%.json") as Workspace).getBoundedContextByRefOrThrow(
					"#/boundedcontexts/led~1ger~0#%",
				),
			);
		const smaller = WorkspaceSet.fromSchemas(
			dump(set).filter(([file]) => ["a#%.json", "my team.json"].includes(file)),
		);
		expect(keyIn(smaller)).toBe(keyIn(loaded));
	});

	it("reads back every composite identity: a consumption, a relationship, an answer", () => {
		const { set, links } = ringOfFiles();
		const loaded = WorkspaceSet.fromSchemas(dump(set));
		for (const [i, link] of links.entries()) {
			// The consumer is the next file; its refs were dumped from the DSL.
			const consumerFile = PATHS[(i + 1) % PATHS.length];
			const consumer = loaded.byPath(consumerFile) as Workspace;
			const consumption = consumer
				.getServiceByRefOrThrow(
					`#/boundedcontexts/led~1ger~0#%/services/pay~1ments~0`,
				)
				.consumptions.find((c) => c.consumable.provider.name === "Payments");
			expect(consumption?.ref).toBe(link.consumption.ref);
			const resolved = loaded.resolve(
				consumer,
				link.consumption.ref,
				REF_KINDS.consumption,
			);
			expect(resolved.ok && resolved.target).toBe(consumption);

			// The relationship is declared by the upstream, whose file is `i`.
			const declaring = loaded.byPath(PATHS[i]) as Workspace;
			const relationship = declaring.relationships[0];
			expect(relationship.ref).toBe(set.byPath(PATHS[i])?.relationships[0].ref);
			const viaRelationship = loaded.resolve(
				declaring,
				relationship.ref,
				REF_KINDS.relationship,
			);
			expect(viaRelationship.ok && viaRelationship.target).toBe(relationship);

			// The answer is the refusal of an operation of the consumer's file
			// with a schema of this one, named from this one.
			const policy = declaring.getPolicyByRefOrThrow(
				"#/boundedcontexts/led~1ger~0#%/policies/await",
			);
			const heard = policy.events[0];
			const written = loaded.refTo(declaring, heard);
			const answer = loaded.resolve(declaring, written, REF_KINDS.answer);
			expect(answer.ok && answer.target).toBe(heard);
			expect(written).toBe(
				set.refTo(set.byPath(PATHS[i]) as Workspace, link.answer),
			);
			expect(written).toContain("/rejects-in/");
		}
	});

	it("loads a ring of files with no diagnostic about the ring itself", () => {
		const { set } = ringOfFiles();
		const loaded = WorkspaceSet.fromSchemas(dump(set));
		const aboutFiles = loaded
			.validate()
			.filter((d) =>
				[
					"unresolved-ref",
					"unknown-field",
					"ods-version",
					"file-path-invalid",
					"workspace-id-unique",
				].includes(d.rule),
			);
		expect(aboutFiles).toEqual([]);
	});
});

describe("files that refer to each other are legal; a cycle in the model is still a cycle", () => {
	it("two files that give each other their subdomain and team load and validate clean", () => {
		const a = new WorkspaceModel("Team A", { description: "", version: "0" });
		const b = new WorkspaceModel("Team B", { description: "", version: "0" });
		const subA = a
			.addDomain("Domain", { description: "" })
			.addSubdomain("Sub", { type: "core", description: "" });
		const subB = b
			.addDomain("Domain", { description: "" })
			.addSubdomain("Sub", { type: "core", description: "" });
		const teamA = a.addTeam("Owners", {});
		const teamB = b.addTeam("Owners", {});
		// Each file's context serves and is owned by the other file's.
		a.addBoundedContext("Home", {
			description: "",
			subdomains: [subB],
			team: teamB,
		});
		b.addBoundedContext("Home", {
			description: "",
			subdomains: [subA],
			team: teamA,
		});
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", a],
			["b.json", b],
		]);
		expect(set.validate()).toEqual([]);
		const loaded = WorkspaceSet.fromSchemas(dump(set));
		expect(loaded.validate()).toEqual([]);
		expect(JSON.stringify(dump(loaded))).toBe(JSON.stringify(dump(set)));
	});

	it("derived views read across the cycle: a subdomain and a team list the contexts of both files", () => {
		const a = new WorkspaceModel("Team A", { description: "", version: "0" });
		const b = new WorkspaceModel("Team B", { description: "", version: "0" });
		const subB = b
			.addDomain("Domain", { description: "" })
			.addSubdomain("Sub", { type: "core", description: "" });
		const teamB = b.addTeam("Owners", {});
		const inA = a.addBoundedContext("Home", {
			description: "",
			subdomains: [subB],
			team: teamB,
		});
		const inB = b.addBoundedContext("Home", {
			description: "",
			subdomains: [subB],
			team: teamB,
		});
		// Before the set, a workspace sees only its own.
		expect([...subB.boundedcontexts.values()]).toEqual([inB]);
		expect(teamB.boundedcontexts).toEqual([inB]);
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", a],
			["b.json", b],
		]);
		expect([...subB.boundedcontexts.values()]).toEqual([inA, inB]);
		expect([...subB.boundedcontexts.keys()]).toEqual([
			setKeyOf(inA),
			setKeyOf(inB),
		]);
		expect(teamB.boundedcontexts).toEqual([inA, inB]);
		expect(set.workspaces).toHaveLength(2);
	});
});
