import fs from "node:fs";
import path from "node:path";
import { toDoc } from "@open-domain-specification/doc";
import { workspace } from "./petstore/workspace.ts";

for (const d of workspace.validate()) {
	console.log(`[${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
}

toDoc(workspace).then((res) => {
	for (const [file, content] of Object.entries(res)) {
		const _file = path.join("docs", file);
		const folder = path.dirname(_file);
		if (!fs.existsSync(folder)) {
			fs.mkdirSync(folder, { recursive: true });
		}
		fs.writeFileSync(_file, content, "utf-8");
	}

	fs.writeFileSync(
		"./docs/workspace.json",
		JSON.stringify(workspace.toSchema(), null, 2),
		"utf-8",
	);

	// The same model as a .ods folder, which is what the VS Code extension opens.
	fs.mkdirSync(".ods", { recursive: true });
	fs.writeFileSync(
		".ods/petstore.json",
		JSON.stringify(
			{ $schema: "./schema.json", ...workspace.toSchema() },
			null,
			2,
		),
		"utf-8",
	);
});
