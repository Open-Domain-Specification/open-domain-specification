import fs from "node:fs";
import path from "node:path";
import { toDoc } from "@open-domain-specification/doc";
import { workspace } from "./eshop/workspace.ts";

fs.writeFileSync(
	"./docs/workspace.json",
	JSON.stringify(workspace.toSchema(), null, 2),
	"utf-8",
);

toDoc(workspace).then((res) => {
	for (const [file, content] of Object.entries(res)) {
		const _file = path.join("docs", file);
		const folder = path.dirname(_file);
		if (!fs.existsSync(folder)) {
			fs.mkdirSync(folder, { recursive: true });
		}
		fs.writeFileSync(_file, content, "utf-8");
	}
});
