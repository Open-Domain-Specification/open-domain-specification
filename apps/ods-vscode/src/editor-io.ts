import { createHash } from "node:crypto";
import type { SetPath } from "@open-domain-specification/core";
import { messageOf } from "./assemble";
import type { TextIo, TextRead, WriteOutcome } from "./writer";

/**
 * The editor half of the write port, without importing `vscode`: the host
 * (see `vscode-host.ts`) says what an open document is and how to replace its
 * text, and this module decides what to do with them. That keeps every branch
 * testable under vitest with a fake host, while the real host is exercised by
 * the real-VS-Code suite.
 *
 * Editor first: a file open in an editor is read from its BUFFER (unsaved text
 * included), and written by an edit to that buffer, never behind its back.
 *
 * - Dirty buffer: the edit is applied in place and the buffer stays dirty. The
 *   person keeps control of when to save; nothing here saves it.
 * - Clean buffer: edited, then saved, so the file on disk follows.
 * - Not open: the disk path, unchanged.
 *
 * Staleness: the stamp of a buffer read is its version plus a digest of its
 * text. It is compared again immediately before the edit. What VS Code does
 * when an edit is applied to a document whose version moved is a property of
 * the host, observed (not assumed) by the real-VS-Code suite.
 */

/** What the writer needs from an open text document. Structural, so `vscode.TextDocument` satisfies it. */
export interface OpenDocument {
	readonly version: number;
	readonly isDirty: boolean;
	getText(): string;
	save(): PromiseLike<boolean>;
}

export interface EditorHost<D extends OpenDocument = OpenDocument> {
	/** The document already open for this file, in any state, or undefined. Never opens one. */
	openDocument(file: SetPath): D | undefined;
	/** Replaces the whole text of `document` by one edit applied to the buffer. False when the editor did not accept it. */
	replaceAll(file: SetPath, document: D, text: string): PromiseLike<boolean>;
}

const BUFFER = "buffer:";

const UNSAVED_ACTION =
	"The change is in the open editor, unsaved. The file on disk may have changed since the editor loaded it: compare the two in the editor, then save to keep the change or revert to drop it.";

const digest = (text: string) => createHash("sha1").update(text).digest("hex");

export const bufferStamp = (document: OpenDocument): string =>
	`${BUFFER}${document.version}:${digest(document.getText())}`;

/** Reads and writes through the open editor when there is one, else through `disk`. */
export function editorFirstIo<D extends OpenDocument>(
	disk: TextIo,
	host: EditorHost<D>,
): TextIo {
	return {
		async readText(file): Promise<TextRead> {
			const document = host.openDocument(file);
			if (!document) return disk.readText(file);
			return {
				ok: true,
				text: document.getText(),
				hash: bufferStamp(document),
			};
		},

		async writeIfUnchanged(file, text, expectedHash): Promise<WriteOutcome> {
			const document = host.openDocument(file);
			const readFromBuffer = expectedHash.startsWith(BUFFER);
			// The file was read from one place and is now in the other (opened
			// or closed since): what was read may not be what is there.
			if (!document) {
				return readFromBuffer
					? { status: "changed" }
					: disk.writeIfUnchanged(file, text, expectedHash);
			}
			if (!readFromBuffer || bufferStamp(document) !== expectedHash)
				return { status: "changed" };

			const wasDirty = document.isDirty;
			const accepted = await host.replaceAll(file, document, text);
			if (!accepted) {
				const now = host.openDocument(file);
				return !now || bufferStamp(now) !== expectedHash
					? { status: "changed" }
					: { status: "failed", detail: "the editor did not accept the edit" };
			}
			if (wasDirty) return { status: "ok", via: "buffer" };
			let saved: boolean;
			try {
				saved = await document.save();
			} catch (e) {
				// The host refused to save (for example the file on disk is newer);
				// the edit is in the buffer, so say so rather than throw.
				return {
					status: "failed",
					detail: `${messageOf(e)}; the change is in the open editor, unsaved there`,
					action: UNSAVED_ACTION,
				};
			}
			return saved
				? { status: "ok", via: "buffer-saved" }
				: {
						status: "failed",
						detail:
							"the change is in the open editor but saving it failed, so it is unsaved there",
						action: UNSAVED_ACTION,
					};
		},
	};
}
