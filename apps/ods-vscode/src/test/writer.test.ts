import * as assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { editorFirstIo } from "../editor-io";
import type { OdsTestApi } from "../extension";
import { vscodeEditorHost } from "../vscode-host";
import {
	applyIntent,
	diskTextIo,
	type Intent,
	type TextIo,
	type UpdateIntent,
	type WriteResult,
} from "../writer";
import { teamSet, teamTexts } from "../writer.support";

const EXTENSION_ID = "open-domain-specification.ods-vscode";

/**
 * Rows G'1 to G'4 of the closure contract, in a real VS Code, plus the probes
 * whose answer was unknown until it ran: what `applyEdit` does with an edit
 * built before the document moved, and what `save()` does when the disk is
 * newer. Probes print `PROBE <name> <json>` lines; the assertions pin only
 * what was observed, so a different answer in another VS Code is a failing
 * test and not a silent change of guarantee.
 */

const T = teamSet();
const touchLedger = (value: string): UpdateIntent => ({
	op: "update",
	file: "a.json",
	target: { ref: T.ledger.ref, kind: "context" },
	field: "description",
	expected: "ledger",
	value,
});
const POST = T.fromB(T.post);
const consumePost: Intent = {
	op: "add",
	file: "b.json",
	parent: { ref: T.account.ref, kind: "element" },
	collection: "consumes",
	element: { consumable: { $ref: POST } },
	providers: [{ ref: POST, kind: "consumable" }],
};

const probe = (name: string, value: unknown) =>
	console.log(`PROBE ${name} ${JSON.stringify(value)}`);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replaces the whole text of an open document by an edit, the way a user's typing would leave it: changed, dirty, unsaved. */
async function setBuffer(doc: vscode.TextDocument, text: string) {
	const edit = new vscode.WorkspaceEdit();
	const end = doc.lineAt(doc.lineCount - 1).range.end;
	edit.replace(doc.uri, new vscode.Range(0, 0, end.line, end.character), text);
	assert.equal(await vscode.workspace.applyEdit(edit), true);
}

const parsed = (doc: vscode.TextDocument) => JSON.parse(doc.getText());

describe("the editor path of the writer in a real VS Code", function () {
	this.timeout(60_000);

	let api: OdsTestApi;
	let dir: string;
	let ods: vscode.Uri;
	let files: string[];
	let texts: Record<string, string>;

	before(async () => {
		const extension = vscode.extensions.getExtension<OdsTestApi>(EXTENSION_ID);
		assert.ok(extension, `extension ${EXTENSION_ID} is not installed`);
		api = await extension.activate();
		// Nothing may save for us: the dirty rows are about NOT saving.
		assert.equal(
			vscode.workspace.getConfiguration("files").get("autoSave"),
			"off",
		);
	});

	beforeEach(async () => {
		dir = await fs.mkdtemp(path.join(tmpdir(), "ods-native-"));
		ods = vscode.Uri.file(dir);
		texts = teamTexts();
		files = Object.keys(texts);
		for (const [f, t] of Object.entries(texts))
			await fs.writeFile(path.join(dir, f), t, "utf8");
	});

	afterEach(async () => {
		// A dirty document would ask to be saved on close and wait for a person.
		for (const doc of vscode.workspace.textDocuments) {
			if (!doc.uri.fsPath.startsWith(dir)) continue;
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand("workbench.action.files.revert");
			await vscode.commands.executeCommand(
				"workbench.action.closeActiveEditor",
			);
		}
		await fs.rm(dir, { recursive: true, force: true });
	});

	const open = (file: string) =>
		vscode.workspace.openTextDocument(vscode.Uri.joinPath(ods, file));
	const onDisk = (file: string) => fs.readFile(path.join(dir, file), "utf8");
	const realIo = (): TextIo =>
		editorFirstIo(diskTextIo(dir), vscodeEditorHost(ods));

	it("G'1 a dirty owning buffer is edited in place and left dirty, the disk untouched", async () => {
		const doc = await open("a.json");
		const typed = parsed(doc);
		typed.boundedcontexts.risk.description = "typed, not saved";
		await setBuffer(doc, `${JSON.stringify(typed, null, 2)}\n`);
		assert.equal(doc.isDirty, true);
		const versionBefore = doc.version;

		const r = await api.project.applyIntent(
			ods,
			touchLedger("through the buffer"),
		);

		assert.deepEqual(r, { ok: true, file: "a.json", wrote: "buffer" });
		assert.equal(doc.isDirty, true, "the buffer must stay dirty");
		assert.ok(doc.version > versionBefore);
		assert.equal(
			parsed(doc).boundedcontexts.ledger.description,
			"through the buffer",
		);
		assert.equal(
			parsed(doc).boundedcontexts.risk.description,
			"typed, not saved",
		);
		assert.equal(
			await onDisk("a.json"),
			texts["a.json"],
			"nothing may reach the disk",
		);
		await delay(500);
		assert.equal(
			await onDisk("a.json"),
			texts["a.json"],
			"and nothing autosaves",
		);
	});

	it("G'2 the buffer moves between the read and the edit: re-read once, then file-changed", async () => {
		const doc = await open("a.json");
		const real = realIo();
		let moved = 0;
		const keystrokeAtTheBoundary = (limit: number): TextIo => ({
			readText: real.readText,
			writeIfUnchanged: async (file, text, hash) => {
				if (moved < limit) {
					moved++;
					const t = parsed(doc);
					t.boundedcontexts.risk.description = `keystroke ${moved}`;
					await setBuffer(doc, `${JSON.stringify(t, null, 2)}\n`);
				}
				return real.writeIfUnchanged(file, text, hash);
			},
		});

		const once = await applyIntent(
			keystrokeAtTheBoundary(1),
			files,
			touchLedger("retried"),
		);
		assert.deepEqual(once, { ok: true, file: "a.json", wrote: "buffer" });
		assert.equal(parsed(doc).boundedcontexts.risk.description, "keystroke 1");
		assert.equal(parsed(doc).boundedcontexts.ledger.description, "retried");

		moved = 0;
		const textBefore = doc.getText();
		const twice: WriteResult = await applyIntent(
			keystrokeAtTheBoundary(2),
			files,
			{ ...touchLedger("never"), expected: "retried" },
		);
		assert.equal(twice.ok, false);
		if (!twice.ok) assert.equal(twice.cause, "file-changed");
		assert.equal(parsed(doc).boundedcontexts.ledger.description, "retried");
		assert.notEqual(
			doc.getText(),
			textBefore,
			"only the simulated keystrokes landed",
		);
		assert.equal(parsed(doc).boundedcontexts.risk.description, "keystroke 2");
	});

	it("G'2 probe: does applyEdit reject an edit built before the document moved?", async () => {
		const doc = await open("a.json");
		const stale = new vscode.WorkspaceEdit();
		const end = doc.lineAt(doc.lineCount - 1).range.end;
		const snapshotVersion = doc.version;
		const target = parsed(doc);
		target.boundedcontexts.ledger.description = "from the stale edit";
		stale.replace(
			doc.uri,
			new vscode.Range(0, 0, end.line, end.character),
			`${JSON.stringify(target, null, 2)}\n`,
		);

		// The document moves after the edit object was built.
		const mover = parsed(doc);
		mover.boundedcontexts.risk.description = "moved first";
		await setBuffer(doc, `${JSON.stringify(mover, null, 2)}\n`);
		assert.ok(doc.version > snapshotVersion);

		const accepted = await vscode.workspace.applyEdit(stale);
		const result = {
			snapshotVersion,
			versionAfterMove: snapshotVersion + 1 <= doc.version,
			accepted,
			riskAfter: parsed(doc).boundedcontexts.risk.description,
			ledgerAfter: parsed(doc).boundedcontexts.ledger.description,
		};
		probe("applyEdit-after-document-moved", result);
		// Pinned to what VS Code 1.96.4 did when this was run: the edit object carries
		// no version of its own, so it lands on the current text and replaces it. The
		// writer therefore does NOT rely on applyEdit to refuse stale work; its own
		// stamp comparison immediately before the edit (G'2 above) is the check.
		assert.equal(accepted, true);
		assert.equal(result.ledgerAfter, "from the stale edit");
		assert.equal(result.riskAfter, "risk", "the move was overwritten");
	});

	it("G'2 probe: an edit applied while a keystroke is still in flight", async () => {
		const doc = await open("a.json");
		const editor = await vscode.window.showTextDocument(doc);
		const t = parsed(doc);
		t.boundedcontexts.ledger.description = "applied during typing";
		const edit = new vscode.WorkspaceEdit();
		const end = doc.lineAt(doc.lineCount - 1).range.end;
		edit.replace(
			doc.uri,
			new vscode.Range(0, 0, end.line, end.character),
			`${JSON.stringify(t, null, 2)}\n`,
		);
		editor.selection = new vscode.Selection(0, 0, 0, 0);
		const typing = vscode.commands.executeCommand("type", { text: " " });
		const applied = vscode.workspace.applyEdit(edit);
		const [, accepted] = await Promise.all([typing, applied]);
		await delay(200);
		probe("applyEdit-with-keystroke-in-flight", {
			accepted,
			ledger: (() => {
				try {
					return parsed(doc).boundedcontexts.ledger.description;
				} catch {
					return "(buffer no longer parses)";
				}
			})(),
			startsWithSpace: doc.getText().startsWith(" "),
		});
		// Whatever the outcome, the editor holds ONE coherent text: either the edit
		// won and the keystroke was before it, or the edit was rejected.
		assert.equal(typeof accepted, "boolean");
	});

	it("G'3 a dirty buffer of another file is read as the dependency and never written", async () => {
		const a = await open("a.json");
		const unsaved = parsed(a);
		unsaved.boundedcontexts.ledger.services.payments.provides.refund = {
			name: "Refund",
			description: "",
			type: "operation",
		};
		await setBuffer(a, `${JSON.stringify(unsaved, null, 2)}\n`);
		const unsavedText = a.getText();
		const refund =
			"a.json#/boundedcontexts/ledger/services/payments/provides/refund";

		const r = await api.project.applyIntent(ods, {
			op: "add",
			file: "b.json",
			parent: { ref: T.account.ref, kind: "element" },
			collection: "consumes",
			element: { consumable: { $ref: refund } },
			providers: [{ ref: refund, kind: "consumable" }],
		});

		assert.deepEqual(r, { ok: true, file: "b.json", wrote: "disk" });
		assert.equal(a.getText(), unsavedText, "the other buffer is untouched");
		assert.equal(a.isDirty, true, "and still dirty");
		assert.equal(
			await onDisk("a.json"),
			texts["a.json"],
			"its disk file is untouched",
		);
		assert.equal(
			JSON.parse(await onDisk("b.json")).boundedcontexts.claims.aggregates
				.account.consumes[0].consumable.$ref,
			refund,
		);
	});

	it("G'4 a clean open buffer is edited, then saved", async () => {
		const doc = await open("a.json");
		assert.equal(doc.isDirty, false);

		const r = await api.project.applyIntent(
			ods,
			touchLedger("saved by the writer"),
		);

		assert.deepEqual(r, { ok: true, file: "a.json", wrote: "buffer-saved" });
		assert.equal(doc.isDirty, false);
		assert.equal(
			parsed(doc).boundedcontexts.ledger.description,
			"saved by the writer",
		);
		assert.equal(await onDisk("a.json"), doc.getText());
		assert.equal(
			JSON.parse(await onDisk("a.json")).boundedcontexts.ledger.description,
			"saved by the writer",
		);
		assert.equal(await onDisk("b.json"), texts["b.json"]);
	});

	it("a file that is not open takes the disk path, and an unrelated open dirty buffer is not disturbed", async () => {
		const c = await open("c.json");
		const typed = parsed(c);
		typed.boundedcontexts.depot.description = "typing in c";
		await setBuffer(c, `${JSON.stringify(typed, null, 2)}\n`);
		const r = await api.project.applyIntent(ods, consumePost);
		assert.deepEqual(r, { ok: true, file: "b.json", wrote: "disk" });
		assert.equal(c.isDirty, true);
		assert.equal(parsed(c).boundedcontexts.depot.description, "typing in c");
	});

	it("G'5 probe: save() on a clean buffer whose file changed on disk", async () => {
		const doc = await open("a.json");
		const external = parsed(doc);
		external.boundedcontexts.risk.description =
			"changed on disk by someone else";
		await fs.writeFile(
			path.join(dir, "a.json"),
			`${JSON.stringify(external, null, 2)}\n`,
			"utf8",
		);
		// No wait: the buffer has not reloaded yet, which is the window being probed.
		const outcome = await Promise.race([
			api.project.applyIntent(ods, touchLedger("over a newer disk file")),
			delay(20_000).then(() => "timed out" as const),
		]);
		await delay(300);
		const disk = JSON.parse(await onDisk("a.json"));
		probe("save-after-disk-changed", {
			outcome,
			bufferRisk: parsed(doc).boundedcontexts.risk.description,
			bufferLedger: parsed(doc).boundedcontexts.ledger.description,
			diskRisk: disk.boundedcontexts.risk.description,
			diskLedger: disk.boundedcontexts.ledger.description,
			dirty: doc.isDirty,
		});
		assert.notEqual(outcome, "timed out", "save() must not wait for a person");
		// Observed in 1.96.4: save() refuses ("File Modified Since"), the change stays in the dirty buffer.
		assert.ok(
			typeof outcome === "object" &&
				!outcome.ok &&
				outcome.cause === "write-failed",
		);
		assert.match(outcome.action, /compare the two/);
		assert.equal(doc.isDirty, true);
		assert.equal(
			disk.boundedcontexts.risk.description,
			"changed on disk by someone else",
		);
		assert.equal(disk.boundedcontexts.ledger.description, "ledger");
		// Whatever it was, the writer never loses the outside edit silently: either it
		// is in the file the writer saved, or the writer said it did not save.
		if (typeof outcome === "object" && outcome.ok)
			assert.equal(
				disk.boundedcontexts.risk.description,
				"changed on disk by someone else",
			);
	});
});

describe("Problems land on the file that owns them, in a real VS Code", function () {
	this.timeout(60_000);
	let api: OdsTestApi;
	let odsDir: vscode.Uri;

	before(async () => {
		const extension = vscode.extensions.getExtension<OdsTestApi>(EXTENSION_ID);
		assert.ok(extension);
		api = await extension.activate();
		const folder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(folder, "the window must be opened on the writer fixture");
		odsDir = vscode.Uri.joinPath(folder.uri, ".ods");
	});

	after(async () => {
		await fs.rm(odsDir.fsPath, { recursive: true, force: true });
		await api.project.reload();
	});

	async function until(check: () => boolean, what: string) {
		const deadline = Date.now() + 15_000;
		while (Date.now() < deadline) {
			if (check()) return;
			await delay(100);
		}
		assert.fail(`timed out waiting for ${what}`);
	}

	it("one set per folder: a reference across files resolves, a broken sibling is its own problem, and nothing is attributed to the wrong file", async () => {
		await fs.mkdir(odsDir.fsPath, { recursive: true });
		const texts = teamTexts();
		// b.json refers into a.json; c.json is broken JSON; a.json carries a retained qualified-invalid ref.
		const b = JSON.parse(texts["b.json"]);
		b.relationships.unshift({
			type: "upstream-downstream",
			upstream: { $ref: "gone.json#/boundedcontexts/x" },
			downstream: { $ref: "#/boundedcontexts/claims" },
			description: "waiting",
		});
		await fs.writeFile(path.join(odsDir.fsPath, "a.json"), texts["a.json"]);
		await fs.writeFile(
			path.join(odsDir.fsPath, "b.json"),
			JSON.stringify(b, null, 2),
		);
		await fs.writeFile(path.join(odsDir.fsPath, "c.json"), '{ "name": ');
		// An upper-case name sorts before every lower-case one by code point, and after them by locale.
		const upper = JSON.parse(texts["c.json"]);
		upper.id = "team_z";
		await fs.writeFile(
			path.join(odsDir.fsPath, "Z.json"),
			JSON.stringify(upper, null, 2),
		);
		await api.project.reload();

		const uri = (f: string) => vscode.Uri.joinPath(odsDir, f);
		const problems = (f: string) =>
			vscode.languages.getDiagnostics(uri(f)).filter((d) => d.source === "ods");
		await until(() => problems("c.json").length > 0, "c.json problem");

		const c = problems("c.json");
		assert.equal(c.length, 1);
		assert.match(c[0].message, /c\.json is not valid JSON/);
		assert.match(c[0].message, /Fix the syntax/);
		assert.ok(
			c[0].range.start.character > 0,
			"the error is placed where the JSON broke",
		);

		const bProblems = problems("b.json");
		assert.ok(
			bProblems.some((d) => d.code === "unresolved-ref"),
			"b.json carries its own unresolved ref",
		);
		assert.ok(!problems("a.json").some((d) => d.code === "unresolved-ref"));
		assert.deepEqual(api.project.workspaces.map((f) => f.relativePath).sort(), [
			"Z.json",
			"a.json",
			"b.json",
		]);
		const set = api.project.sets.get(odsDir.toString())?.assembled.set;
		assert.deepEqual(
			set?.workspaces.map((w) => w.file),
			["Z.json", "a.json", "b.json"],
			"the set's input order is code point order, not the machine's locale order",
		);
		assert.equal(
			api.project.files.get(uri("c.json").toString())?.workspace,
			undefined,
		);
	});

	it("a file that stops loading keeps its last good model on screen, labelled stale, and the writer does not use it", async () => {
		const texts = teamTexts();
		await fs.writeFile(path.join(odsDir.fsPath, "c.json"), texts["c.json"]);
		await api.project.reload();
		const key = vscode.Uri.joinPath(odsDir, "c.json").toString();
		await until(
			() => api.project.files.get(key)?.workspace !== undefined,
			"c.json to load",
		);
		assert.equal(api.project.files.get(key)?.stale, undefined);

		await fs.writeFile(path.join(odsDir.fsPath, "c.json"), "{ broken");
		await api.project.reload();
		const shown = api.project.files.get(key);
		assert.ok(shown?.workspace, "the display keeps the last good model");
		assert.equal(shown?.stale, true, "and says it is stale");
		assert.ok(shown?.error);

		// The edit path reads fresh text: the broken owner is refused, not served from memory.
		const r = await api.project.applyIntent(odsDir, {
			op: "update",
			file: "c.json",
			target: { ref: "#", kind: "element" },
			field: "description",
			expected: "C",
			value: "x",
		});
		assert.equal(r.ok, false);
		if (!r.ok) assert.equal(r.cause, "owner-unparsable");
	});
});
