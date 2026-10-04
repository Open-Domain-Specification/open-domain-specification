// The authoring form's one script: a classic script, no build step.
//
// It builds nothing. The host renders every field as HTML and sends it whole;
// this script puts that HTML in place, reads the values back out of the real
// controls, and posts exactly four kinds of message: ready, change, save,
// cancel. Whether a value is legal, which choices exist and which reference
// was already wrong when the form opened are the host's to say, never ours.
//
// The host answers every ready, change and save with exactly one reply, in the
// order they were posted, but a person keeps typing while a reply is on its
// way. So each post is remembered with the state of the controls it carried,
// and a reply only replaces the body when it answers the newest post and
// nothing was typed since. Otherwise the controls stay as they are and one
// fresh `change` asks the host to judge what is really there; its reply is
// then a host render of the real current draft.
(() => {
	const api = acquireVsCodeApi();
	const form = document.querySelector("form[data-ods-form]");
	if (!form) return;
	const requestId = form.getAttribute("data-request-id");
	let busy = false;
	// Posts the host has not answered yet, oldest first: { kind, key }.
	const pending = [];

	const lines = (text) =>
		text
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l !== "");

	const part = (row, name) => row.querySelector(`[data-part="${name}"]`);

	function commentOf(row) {
		const text = part(row, "text").value;
		const url = part(row, "url").value.trim();
		if (text.trim() === "" && url === "") return undefined;
		const comment = { text };
		if (url !== "") {
			const link = { kind: part(row, "kind").value, url };
			const label = part(row, "label").value.trim();
			if (label !== "") link.label = label;
			comment.link = link;
		}
		return comment;
	}

	function rejectionOf(row) {
		const schema = part(row, "schema").value;
		if (schema === "") return undefined;
		const out = { schema };
		if (part(row, "many").checked) out.many = true;
		const reasons = lines(part(row, "reasons").value);
		if (reasons.length) out.reasons = reasons;
		return out;
	}

	function readValue(field) {
		const control = field.getAttribute("data-control");
		const name = field.getAttribute("data-name");
		const rows = (kind) => [...field.querySelectorAll(`[data-row="${kind}"]`)];
		switch (control) {
			case "checkbox":
				return field.querySelector("input[type=checkbox]").checked;
			case "checkbox-list":
				return [...field.querySelectorAll("input[type=checkbox]")]
					.filter((i) => i.checked)
					.map((i) => i.value);
			case "text-list":
				return lines(field.querySelector("textarea").value);
			case "evidence": {
				const disposition = part(field, "disposition").value;
				const value = {
					comments: rows("comment").map(commentOf).filter(Boolean),
				};
				if (disposition !== "") value.disposition = disposition;
				return value;
			}
			case "rejection-rows":
				return rows("rejection").map(rejectionOf).filter(Boolean);
			default:
				return form.elements.namedItem(name).value;
		}
	}

	function collect() {
		const values = {};
		let owner;
		for (const field of form.querySelectorAll(".field[data-name]")) {
			const name = field.getAttribute("data-name");
			if (field.getAttribute("data-control") === "owner") {
				owner = field.querySelector("select").value;
				continue;
			}
			values[name] = readValue(field);
		}
		return owner === undefined ? { values } : { values, owner };
	}

	// Every control in the body as it stands now, including rows `collect` drops
	// as unfinished (a refusal with no schema, a comment with no text or link).
	// Row templates are inert and are not seen.
	function controlsKey() {
		return JSON.stringify(
			[
				...form.querySelectorAll(
					"[data-body] input, [data-body] select, [data-body] textarea",
				),
			].map((el) => [el.id, el.type === "checkbox" ? el.checked : el.value]),
		);
	}

	function post(message) {
		pending.push({ kind: message.type, key: controlsKey() });
		api.postMessage({ ...message, requestId, ...collect() });
	}

	const unfinished = (row) =>
		(row.getAttribute("data-row") === "comment"
			? commentOf(row)
			: rejectionOf(row)) === undefined;

	// Appends a blank row from the fieldset's template; the host never sees it
	// until it is finished enough for `collect` to send.
	function addRow(box) {
		const rows = box.querySelector("[data-rows]");
		const template = box.querySelector("template[data-row-template]");
		const next = Number(rows.getAttribute("data-next") || "0");
		rows.setAttribute("data-next", String(next + 1));
		rows.insertAdjacentHTML(
			"beforeend",
			template.innerHTML.split("__I__").join(String(next)),
		);
		return rows.lastElementChild;
	}

	function clearErrors() {
		for (const alert of form.querySelectorAll('[role="alert"]'))
			alert.textContent = "";
		for (const el of form.querySelectorAll("[aria-invalid]"))
			el.removeAttribute("aria-invalid");
	}

	function showErrors(msg, moveFocus) {
		clearErrors();
		const formAlert = form.querySelector('[data-field=""]');
		if (formAlert) formAlert.textContent = msg.form.join(" ");
		let first;
		for (const [name, messages] of Object.entries(msg.fields)) {
			const alert = [...form.querySelectorAll('[role="alert"]')].find(
				(a) => a.getAttribute("data-field") === name,
			);
			if (alert) alert.textContent = messages.join(" ");
			const target =
				document.getElementById(`f-${name}`) ??
				alert?.closest(".field")?.querySelector("input,select,textarea");
			if (target) {
				target.setAttribute("aria-invalid", "true");
				first = first ?? target;
			}
		}
		// Never pull focus away from text typed after the save that failed.
		if (!moveFocus) return;
		if (first) first.focus();
		else if (formAlert?.textContent) {
			formAlert.setAttribute("tabindex", "-1");
			formAlert.focus();
		}
	}

	function showBody(html) {
		const body = form.querySelector("[data-body]");
		const active = document.activeElement;
		const id = active?.id;
		const start = active?.selectionStart;
		const end = active?.selectionEnd;
		// Once the body is replaced the old control is detached, so ask now.
		const inBody = body.contains(active);
		// Rows still being filled in are the person's alone: the host was never
		// sent them. They survive a refresh, rebuilt from the host's fresh row
		// template (so a refusal's schemas are the host's current ones) with
		// the values typed so far; a field the host now hides takes its rows with it.
		const kept = [...body.querySelectorAll("[data-row]")].filter(unfinished);
		body.innerHTML = html;
		clearErrors();
		const moved = new Map();
		for (const old of kept) {
			const name = old.closest(".field[data-name]")?.getAttribute("data-name");
			const field = [...body.querySelectorAll(".field[data-name]")].find(
				(f) => f.getAttribute("data-name") === name,
			);
			const box = field?.querySelector("fieldset");
			if (!box) continue;
			const row = addRow(box);
			for (const from of old.querySelectorAll("[data-part]")) {
				const to = part(row, from.getAttribute("data-part"));
				if (!to) continue;
				if (from.type === "checkbox") to.checked = from.checked;
				else if (
					!to.options ||
					[...to.options].some((o) => o.value === from.value)
				)
					to.value = from.value;
				moved.set(from, to);
			}
		}
		const again =
			moved.get(active) ?? (id ? document.getElementById(id) : undefined);
		if (again && inBody) {
			again.focus();
			if (
				typeof start === "number" &&
				typeof again.setSelectionRange === "function"
			)
				try {
					again.setSelectionRange(start, end);
				} catch {}
		}
	}

	window.addEventListener("message", (event) => {
		const msg = event.data;
		if (!msg || typeof msg !== "object") return;
		if (msg.type !== "body" && msg.type !== "errors") return;
		// Replies come back in the order the posts went out.
		const answered = pending.shift() ?? { kind: "unsolicited", key: undefined };
		// A save's own reply, and only that, frees Save again.
		if (answered.kind === "save") busy = false;
		const newest = pending.length === 0;
		const settled = newest && answered.key === controlsKey();
		if (msg.type === "body") {
			if (settled) showBody(msg.html);
		} else showErrors(msg, settled);
		// Typed since the newest post, and nothing else on its way: have the host
		// judge the real draft, so the next body it sends is the true one. Not
		// after a save: its body would clear the refusal the person must read,
		// and the next Save sends the controls as they stand anyway.
		if (
			newest &&
			!settled &&
			answered.key !== undefined &&
			answered.kind !== "save"
		)
			post({ type: "change", field: "" });
	});

	form.addEventListener("change", (event) => {
		const field = event.target.closest?.(".field[data-name]");
		if (!field || field.getAttribute("data-refresh") !== "true") return;
		post({ type: "change", field: field.getAttribute("data-name") });
	});

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (busy) return;
		busy = true;
		clearErrors();
		post({ type: "save" });
	});

	form.addEventListener("click", (event) => {
		const button = event.target.closest?.("button[data-action]");
		if (!button) return;
		const action = button.getAttribute("data-action");
		if (action === "cancel") {
			api.postMessage({ type: "cancel", requestId });
		} else if (action === "add-row") {
			addRow(button.closest("fieldset"))
				?.querySelector("select,textarea,input")
				?.focus();
		} else if (action === "remove-row") {
			const row = button.closest("[data-row]");
			const box = row.closest("fieldset");
			row.remove();
			box.querySelector("button[data-action=add-row]")?.focus();
		}
	});

	post({ type: "ready" });
})();
