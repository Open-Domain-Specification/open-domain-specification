import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	bufferStamp,
	type EditorHost,
	editorFirstIo,
	type OpenDocument,
} from "./editor-io";
import { applyIntent, diskTextIo, type Intent, type TextIo } from "./writer";
import { teamSet, teamTexts } from "./writer.support";

/**
 * The editor-first decisions with a fake host: an in-memory document that
 * keeps text, a version and a dirty flag the way an editor does. This is the
 * vscode-free analogue of rows G'1 to G'4; the real editor's behaviour is
 * proved only by the real-VS-Code suite (`src/test/writer.test.ts`).
 */

class FakeDoc implements OpenDocument {
	version = 1;
	isDirty: boolean;
	saves = 0;
	saveResult = true;
	saveThrows: unknown;
	constructor(
		public text: string,
		dirty: boolean,
	) {
		this.isDirty = dirty;
	}
	getText() {
		return this.text;
	}
	async save() {
		this.saves++;
		if (this.saveThrows !== undefined) throw this.saveThrows;
		if (this.saveResult) {
			this.isDirty = false;
			this.version++;
		}
		return this.saveResult;
	}
	/** What typing does: new text, new version, dirty. */
	type(text: string) {
		this.text = text;
		this.version++;
		this.isDirty = true;
	}
}

class FakeHost implements EditorHost<FakeDoc> {
	docs = new Map<string, FakeDoc>();
	replaced: string[] = [];
	accept = true;
	/** Runs inside replaceAll before the edit lands, to model a keystroke racing the edit. */
	during?: (file: string) => void;
	openDocument(file: string) {
		return this.docs.get(file);
	}
	async replaceAll(file: string, doc: FakeDoc, text: string) {
		this.during?.(file);
		if (!this.accept) return false;
		this.replaced.push(file);
		doc.text = text;
		doc.version++;
		doc.isDirty = true;
		return true;
	}
}

const dirs: string[] = [];
afterEach(async () => {
	for (const dir of dirs.splice(0))
		await fs.rm(dir, { recursive: true, force: true });
});

async function folder() {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "ods-editor-"));
	dirs.push(dir);
	const texts = teamTexts();
	for (const [f, t] of Object.entries(texts))
		await fs.writeFile(path.join(dir, f), t, "utf8");
	return { dir, files: Object.keys(texts), texts, disk: diskTextIo(dir) };
}

const T = teamSet();
const touchLedger = (value: string, expected = "ledger"): Intent => ({
	op: "update",
	file: "a.json",
	target: { ref: T.ledger.ref, kind: "context" },
	field: "description",
	expected,
	value,
});

describe("G'1 (vscode-free analogue) a dirty owning buffer is edited in place, never saved", () => {
	it("applies to the buffer, keeps the unsaved edit, leaves the disk and the dirty flag alone", async () => {
		const f = await folder();
		const host = new FakeHost();
		const unsaved = JSON.parse(f.texts["a.json"]);
		unsaved.boundedcontexts.risk.description = "typed, not saved";
		const doc = new FakeDoc(`${JSON.stringify(unsaved, null, 2)}\n`, true);
		host.docs.set("a.json", doc);
		const io = editorFirstIo(f.disk, host);
		const r = await applyIntent(io, f.files, touchLedger("via buffer"));
		expect(r).toEqual({ ok: true, file: "a.json", wrote: "buffer" });
		expect(doc.isDirty).toBe(true);
		expect(doc.saves).toBe(0);
		const after = JSON.parse(doc.text);
		expect(after.boundedcontexts.ledger.description).toBe("via buffer");
		expect(after.boundedcontexts.risk.description).toBe("typed, not saved");
		expect(await fs.readFile(path.join(f.dir, "a.json"), "utf8")).toBe(
			f.texts["a.json"],
		);
	});
});

describe("G'2 (vscode-free analogue) the buffer changes between the read and the edit", () => {
	it("is retried once from the new buffer text, then succeeds", async () => {
		const f = await folder();
		const host = new FakeHost();
		const doc = new FakeDoc(f.texts["a.json"], true);
		host.docs.set("a.json", doc);
		const real = editorFirstIo(f.disk, host);
		let raced = false;
		const io: TextIo = {
			readText: real.readText,
			writeIfUnchanged: async (file, text, hash) => {
				if (!raced) {
					raced = true;
					const typed = JSON.parse(doc.text);
					typed.boundedcontexts.risk.description = "keystroke";
					doc.type(`${JSON.stringify(typed, null, 2)}\n`);
				}
				return real.writeIfUnchanged(file, text, hash);
			},
		};
		const r = await applyIntent(io, f.files, touchLedger("after race"));
		expect(r).toMatchObject({ ok: true, wrote: "buffer" });
		const after = JSON.parse(doc.text);
		expect(after.boundedcontexts.risk.description).toBe("keystroke");
		expect(after.boundedcontexts.ledger.description).toBe("after race");
	});

	it("is file-changed when it moves again, and nothing is edited", async () => {
		const f = await folder();
		const host = new FakeHost();
		const doc = new FakeDoc(f.texts["a.json"], true);
		host.docs.set("a.json", doc);
		const real = editorFirstIo(f.disk, host);
		let n = 0;
		const io: TextIo = {
			readText: real.readText,
			writeIfUnchanged: async (file, text, hash) => {
				doc.type(`${doc.text} `.replace(/\}\n $/, `}\n${" ".repeat(++n)}`));
				return real.writeIfUnchanged(file, text, hash);
			},
		};
		const r = await applyIntent(io, f.files, touchLedger("never"));
		expect(r).toMatchObject({ ok: false, cause: "file-changed" });
		expect(host.replaced).toEqual([]);
		expect(n).toBe(2);
	});

	it("a keystroke landing inside the edit itself is reported as changed", async () => {
		const f = await folder();
		const host = new FakeHost();
		const doc = new FakeDoc(f.texts["a.json"], true);
		host.docs.set("a.json", doc);
		host.accept = false;
		host.during = () => doc.type(`${doc.text} `);
		const io = editorFirstIo(f.disk, host);
		const read = await io.readText("a.json");
		if (!read.ok) throw new Error("setup");
		expect(await io.writeIfUnchanged("a.json", "x", read.hash)).toEqual({
			status: "changed",
		});
	});

	it("an edit the editor refuses with an unchanged buffer is a failure, not a stale read", async () => {
		const f = await folder();
		const host = new FakeHost();
		host.docs.set("a.json", new FakeDoc(f.texts["a.json"], true));
		host.accept = false;
		const io = editorFirstIo(f.disk, host);
		const read = await io.readText("a.json");
		if (!read.ok) throw new Error("setup");
		expect(await io.writeIfUnchanged("a.json", "x", read.hash)).toEqual({
			status: "failed",
			detail: "the editor did not accept the edit",
		});
	});

	it("a document closed while the edit was refused is reported as changed", async () => {
		const f = await folder();
		const host = new FakeHost();
		host.docs.set("a.json", new FakeDoc(f.texts["a.json"], true));
		host.accept = false;
		host.during = (file) => host.docs.delete(file);
		const io = editorFirstIo(f.disk, host);
		const read = await io.readText("a.json");
		if (!read.ok) throw new Error("setup");
		expect(await io.writeIfUnchanged("a.json", "x", read.hash)).toEqual({
			status: "changed",
		});
	});
});

describe("G'3 (vscode-free analogue) a dirty buffer of another file is read and never written", () => {
	it("resolves the provider from the other buffer's unsaved text and edits only the owner", async () => {
		const f = await folder();
		const host = new FakeHost();
		// a.json is dirty with a provider that is not on disk at all.
		const dirty = JSON.parse(f.texts["a.json"]);
		dirty.boundedcontexts.ledger.services.payments.provides.refund = {
			name: "Refund",
			description: "",
			type: "operation",
		};
		const a = new FakeDoc(`${JSON.stringify(dirty, null, 2)}\n`, true);
		host.docs.set("a.json", a);
		const unsavedText = a.text;
		const refund =
			"a.json#/boundedcontexts/ledger/services/payments/provides/refund";
		const io = editorFirstIo(f.disk, host);
		const r = await applyIntent(io, f.files, {
			op: "add",
			file: "b.json",
			parent: { ref: T.account.ref, kind: "element" },
			collection: "consumes",
			element: { consumable: { $ref: refund } },
			providers: [{ ref: refund, kind: "consumable" }],
		});
		expect(r).toEqual({ ok: true, file: "b.json", wrote: "disk" });
		expect(a.text).toBe(unsavedText);
		expect(a.isDirty).toBe(true);
		expect(host.replaced).toEqual([]);
		expect(await fs.readFile(path.join(f.dir, "a.json"), "utf8")).toBe(
			f.texts["a.json"],
		);
		expect(
			JSON.parse(await fs.readFile(path.join(f.dir, "b.json"), "utf8"))
				.boundedcontexts.claims.aggregates.account.consumes[0].consumable.$ref,
		).toBe(refund);
	});
});

describe("G'4 (vscode-free analogue) a clean open buffer is edited, then saved", () => {
	it("edits the buffer and calls save once", async () => {
		const f = await folder();
		const host = new FakeHost();
		const doc = new FakeDoc(f.texts["a.json"], false);
		host.docs.set("a.json", doc);
		const io = editorFirstIo(f.disk, host);
		const r = await applyIntent(io, f.files, touchLedger("saved"));
		expect(r).toEqual({ ok: true, file: "a.json", wrote: "buffer-saved" });
		expect(doc.saves).toBe(1);
		expect(doc.isDirty).toBe(false);
		expect(JSON.parse(doc.text).boundedcontexts.ledger.description).toBe(
			"saved",
		);
	});

	it("reports a save that failed: the change is in the buffer, unsaved", async () => {
		const f = await folder();
		const host = new FakeHost();
		const doc = new FakeDoc(f.texts["a.json"], false);
		doc.saveResult = false;
		host.docs.set("a.json", doc);
		const r = await applyIntent(
			editorFirstIo(f.disk, host),
			f.files,
			touchLedger("unsaved"),
		);
		expect(r).toMatchObject({ ok: false, cause: "write-failed" });
		if (!r.ok) expect(r.detail).toContain("unsaved there");
		expect(doc.isDirty).toBe(true);
	});
});

describe("a host whose save throws", () => {
	it("is a failure that says the change is unsaved in the editor, for an Error and for anything else", async () => {
		for (const thrown of [new Error("file is newer"), "plain"]) {
			const f = await folder();
			const host = new FakeHost();
			const doc = new FakeDoc(f.texts["a.json"], false);
			doc.saveThrows = thrown;
			host.docs.set("a.json", doc);
			const r = await applyIntent(
				editorFirstIo(f.disk, host),
				f.files,
				touchLedger("x"),
			);
			expect(r).toMatchObject({ ok: false, cause: "write-failed" });
			if (!r.ok) {
				expect(r.detail).toContain("unsaved there");
				expect(r.action).toContain("compare the two");
			}
			expect(JSON.parse(doc.text).boundedcontexts.ledger.description).toBe("x");
		}
	});
});

describe("a file read from one place and written to the other", () => {
	it("a buffer closed after the read is changed; one opened after a disk read is changed", async () => {
		const f = await folder();
		const host = new FakeHost();
		const doc = new FakeDoc(f.texts["a.json"], false);
		host.docs.set("a.json", doc);
		const io = editorFirstIo(f.disk, host);
		const fromBuffer = await io.readText("a.json");
		if (!fromBuffer.ok) throw new Error("setup");
		expect(fromBuffer.hash).toBe(bufferStamp(doc));
		host.docs.delete("a.json");
		expect(await io.writeIfUnchanged("a.json", "x", fromBuffer.hash)).toEqual({
			status: "changed",
		});

		const fromDisk = await io.readText("a.json");
		if (!fromDisk.ok) throw new Error("setup");
		expect(fromDisk.hash.startsWith("buffer:")).toBe(false);
		host.docs.set("a.json", doc);
		expect(await io.writeIfUnchanged("a.json", "x", fromDisk.hash)).toEqual({
			status: "changed",
		});
	});

	it("a file that is not open is read and written on the disk", async () => {
		const f = await folder();
		const io = editorFirstIo(f.disk, new FakeHost());
		const r = await applyIntent(io, f.files, touchLedger("disk"));
		expect(r).toEqual({ ok: true, file: "a.json", wrote: "disk" });
	});

	it("the stamp changes with the version and with the text", () => {
		const doc = new FakeDoc("a", false);
		const first = bufferStamp(doc);
		doc.version++;
		expect(bufferStamp(doc)).not.toBe(first);
		doc.text = "b";
		expect(bufferStamp(doc)).not.toContain(":da39a3");
	});
});
