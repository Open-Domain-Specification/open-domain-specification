import { describe, expect, it } from "vitest";
import type { FormField, FormInit } from "./form-protocol";
import { asFormMessage, renderDocument, renderForm, toWebview } from "./render";

const field = (over: Partial<FormField> & Pick<FormField, "name" | "label">) =>
	({
		required: false,
		visible: true,
		control: "text",
		value: "",
		...over,
	}) as FormField;

const initOf = (over: Partial<FormInit> = {}): FormInit => ({
	type: "init",
	requestId: "req-1",
	mode: "update",
	family: "context",
	title: 'Edit bounded context "Payments"',
	fields: [],
	readOnly: [],
	notes: [],
	owner: { file: "trade.json" },
	stamp: "s",
	...over,
});

const teams = [
	{ value: "trade.json#/teams/a", label: "Trade Team", file: "trade.json" },
	{
		value: "ops.json#/teams/a",
		label: "Trade Team",
		detail: "team",
		file: "ops.json",
	},
];

describe("the form markup", () => {
	it("labels every control with its field label, selects the held choice and shows the file of each", () => {
		const html = renderForm(
			initOf({
				fields: [
					field({
						name: "name",
						label: "Name",
						required: true,
						value: "Payments",
					}),
					field({
						name: "description",
						label: "Description",
						control: "textarea",
						value: "x",
					}),
					field({
						name: "team",
						label: "Owned by team",
						control: "select",
						value: "ops.json#/teams/a",
						choices: teams,
					}),
				],
			}),
		);
		expect(html).toContain(
			'<form data-ods-form data-mode="update" data-family="context"',
		);
		expect(html).toContain('<label for="f-name">Name</label>');
		expect(html).toContain('<label for="f-description">Description</label>');
		expect(html).toContain('<label for="f-team">Owned by team</label>');
		expect(html).toContain('id="f-name" name="name" value="Payments"');
		expect(html).toContain(
			'<option value="ops.json#/teams/a" selected>Trade Team — team · ops.json</option>',
		);
		// Both teams read the same; the file tells them apart, and an optional single choice has an empty first row.
		expect(html).toContain(
			'<option value="trade.json#/teams/a">Trade Team — trade.json</option>',
		);
		expect(html).toContain('<select id="f-team" name="team"');
		expect(html).toContain('<option value=""></option>');
		expect(html).toContain('<button type="submit">Save</button>');
		expect(html).toContain(
			'<button type="button" data-action="cancel">Cancel</button>',
		);
		expect(html).toContain('role="alert" class="error" data-field="team"');
		expect(html).toContain(
			'role="alert" class="error form-error" data-field=""',
		);
	});

	it("shows a read-only property with its reason as text", () => {
		const html = renderForm(
			initOf({
				readOnly: [
					{
						label: "Id",
						value: "payments",
						reason:
							"Other files refer to this id, so it cannot be renamed here.",
					},
				],
			}),
		);
		expect(html).toContain('<dl class="readonly">');
		expect(html).toContain("<dt>Id</dt><dd>payments</dd>");
		expect(html).toContain(
			'<dd class="reason">Other files refer to this id, so it cannot be renamed here.</dd>',
		);
	});

	it("shows why a held choice is not legal beside the field and keeps it selected", () => {
		const held = {
			...teams[0],
			disabledReason: "A team of another file may not own a context here.",
		};
		const html = renderForm(
			initOf({
				fields: [
					field({
						name: "team",
						label: "Owned by team",
						control: "select",
						value: held.value,
						choices: [held, teams[1]],
					}),
					field({
						name: "subdomains",
						label: "Serves",
						control: "checkbox-list",
						value: [held.value],
						disabledReason: "The choices could not be checked just now.",
						choices: [held],
					}),
				],
			}),
		);
		// Visible text, named by the control, never only a tooltip or a disabled attribute.
		expect(html).toContain(
			'<p class="reason choice-reason" id="r-team-0"><strong>Trade Team (trade.json)</strong>: A team of another file may not own a context here.</p>',
		);
		expect(html).toMatch(
			/<select id="f-team"[^>]*aria-describedby="[^"]*r-team-0/,
		);
		expect(html).toContain(
			`<option value="${held.value}" selected>Trade Team — trade.json (not a legal choice now)</option>`,
		);
		expect(html).toContain(
			"Serves cannot be changed here: The choices could not be checked just now.",
		);
		expect(html).toMatch(
			/<fieldset disabled aria-describedby="[^"]*d-subdomains/,
		);
		expect(html).toContain(
			`<input type="checkbox" id="f-subdomains-0" name="subdomains" value="${held.value}" checked>`,
		);
		expect(html).not.toMatch(/title="/);
	});

	it("escapes every user string, in text and in attributes", () => {
		const hostile = "<img onerror=x>";
		const html = renderForm(
			initOf({
				title: hostile,
				fields: [
					field({ name: "name", label: hostile, value: `"${hostile}"` }),
					field({
						name: "team",
						label: "Team",
						control: "select",
						value: "",
						choices: [
							{
								value: hostile,
								label: hostile,
								detail: hostile,
								file: hostile,
							},
						],
					}),
				],
				notes: [hostile],
				readOnly: [{ label: hostile, value: hostile, reason: hostile }],
				owner: { file: hostile },
			}),
		);
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img onerror=x&gt;");
		expect(html).toContain('value="&quot;&lt;img onerror=x&gt;&quot;"');
	});

	it("sets a nonce content security policy and loads only the form's own script and style", () => {
		const doc = renderDocument(initOf(), {
			nonce: "n0nce",
			cspSource: "vscode-resource:",
			scriptUri: "vscode-resource:/form.js",
			styleUri: "vscode-resource:/form.css",
		});
		expect(doc).toContain(
			"default-src 'none'; style-src vscode-resource:; script-src 'nonce-n0nce'",
		);
		expect(doc).toContain(
			'<script nonce="n0nce" src="vscode-resource:/form.js">',
		);
		expect(doc).not.toContain("unsafe-inline");
		expect(doc.match(/<script/g)).toHaveLength(1);
		expect(doc).not.toMatch(/\son[a-z]+=/);
	});
});

describe("the messages between the page and the host", () => {
	it("lets only ready, change, save and cancel through, with the shapes the session reads", () => {
		expect(asFormMessage({ type: "ready", requestId: "r" })).toEqual({
			type: "ready",
			requestId: "r",
		});
		expect(
			asFormMessage({
				type: "change",
				requestId: "r",
				field: "team",
				values: { team: "x" },
				owner: "a.json",
			}),
		).toMatchObject({ type: "change", owner: "a.json" });
		expect(asFormMessage({ type: "save", requestId: "r", values: {} })).toEqual(
			{ type: "save", requestId: "r", values: {} },
		);
		expect(asFormMessage({ type: "cancel", requestId: "r" })).toEqual({
			type: "cancel",
			requestId: "r",
		});
		for (const bad of [
			null,
			"save",
			{ type: "open", requestId: "r" },
			{ type: "save", values: {} },
			{ type: "save", requestId: "r", values: [] },
			{ type: "change", requestId: "r", values: {} },
			{ type: "save", requestId: "r", values: {}, owner: 1 },
		])
			expect(asFormMessage(bad)).toBeUndefined();
	});

	it("turns a refusal into a form-level message and field messages, and saved into nothing to draw", () => {
		const refused = toWebview({
			type: "refused",
			requestId: "r",
			cause: "file-changed",
			message: "The file changed.",
			action: "Open the form again.",
			errors: [
				{ field: "team", message: "Pick a legal team." },
				{ field: null, message: "Nothing was written." },
			],
		});
		expect(refused).toEqual({
			type: "errors",
			form: ["The file changed. Open the form again.", "Nothing was written."],
			fields: { team: ["Pick a legal team."] },
		});
		expect(
			toWebview({
				type: "saved",
				requestId: "r",
				file: "a.json",
				wrote: "disk",
				message: "Saved",
			}),
		).toBeUndefined();
	});
});
