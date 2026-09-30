import * as assert from "node:assert/strict";
import type { WebviewMessage } from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsTestApi } from "../extension";

const EXTENSION_ID = "open-domain-specification.ods-vscode";
const FIXTURE = "hostile_links.json";

/** The four links the fixture's description writes that are allowed to stay links. */
const SAFE_HREFS = [
	"http://example.com/INTENTIONAL-FAILURE-69",
	"https://example.com/b",
	"mailto:someone@example.com",
	"#/teams/orders_team",
];

/**
 * A description that carries script must be inert in the real webview. The
 * fixture folder holds one workspace whose description tries every unsafe
 * scheme; the page is opened in VS Code and asked, through the probe, which
 * destinations its rendered links and images carry.
 */
describe("a hostile description in a real VS Code webview", function () {
	this.timeout(60_000);

	it("renders only the safe links and no unsafe image", async () => {
		const extension = vscode.extensions.getExtension<OdsTestApi>(EXTENSION_ID);
		assert.ok(extension, `extension ${EXTENSION_ID} is not installed`);
		const api = await extension.activate();
		const file = api.project.workspaces.find((f) => f.relativePath === FIXTURE);
		assert.ok(file, `${FIXTURE} should be loaded`);

		const rendered: Extract<WebviewMessage, { type: "rendered" }>[] = [];
		const subscription = api.panel.onDidReceiveWebviewMessage((msg) => {
			if (msg.type === "rendered") rendered.push(msg);
		});
		try {
			await vscode.commands.executeCommand("ods.openPage", { file, ref: "#" });
			// The page renders after the model arrives, so ask until it answers with links.
			const deadline = Date.now() + 30_000;
			while (!rendered.some((m) => m.hrefs.length > 0)) {
				assert.ok(
					Date.now() < deadline,
					`the webview never reported rendered links; it said ${JSON.stringify(rendered)}`,
				);
				api.panel.probe();
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
		} finally {
			subscription.dispose();
		}

		const answer = rendered.find((m) => m.hrefs.length > 0);
		assert.ok(answer);
		assert.deepEqual([...answer.hrefs].sort(), [...SAFE_HREFS].sort());
		assert.deepEqual(answer.images, []);
	});
});
