import { copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export default function (): Plugin {
	return {
		name: "copy-example-workspace",
		async buildStart() {
			console.log("Copying example workspace to public folder...");

			const path = resolve(
				__dirname,
				"../../packages/ods-example-ws/dist/big-bank-workspace.json",
			);

			if (!existsSync(path)) {
				throw new Error(`Example workspace file does not exist: ${path}`);
			}

			const publicPath = resolve(__dirname, "./public/big-bank-workspace.json");

			if (existsSync(publicPath)) {
				rmSync(publicPath);
			}

			copyFileSync(path, publicPath);
		},
	};
}
