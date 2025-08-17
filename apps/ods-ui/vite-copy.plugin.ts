import { copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

function resolveFromRoot(path: string): string {
	const p = resolve(__dirname, "../../", path);
	if (!existsSync(p)) {
		throw new Error(`Path does not exist: ${p}`);
	}
	return p;
}

function cfs(from: string, to: string): void {
	if (existsSync(to)) {
		rmSync(to);
	}
	copyFileSync(from, to);
}

export default function (): Plugin {
	return {
		name: "copy-example-workspace",
		async buildStart() {
			console.log("Copying example workspace to public folder...");

			cfs(
				resolveFromRoot("packages/ods-example-ws/docs/workspace.json"),
				resolve(__dirname, "./public/petstore-workspace.json"),
			);

			cfs(
				resolveFromRoot("packages/core/dist/workspace.schema.json"),
				resolve(__dirname, "./public/workspace.schema.json"),
			);
		},
	};
}
