import type { Workspace } from "@open-domain-specification/core";
import { pathToIndexMd } from "./lib/paths";

const escapeHtml = (text: string) =>
	text.replace(
		/[&<>"']/g,
		(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[c] as string,
	);

/**
 * The docsify shell for the generated site. Without it the folder only renders
 * under `docsify serve`, which injects a shell of its own; with it the folder
 * is a complete static site any host can serve.
 *
 * Three details the folder's shape forces:
 * - there is no `README.md`, so a bare `/` is sent to the workspace index. It
 *   is a redirect rather than docsify's `homepage`, because `homepage` leaves
 *   the route at `/` and every relative diagram link then resolves from the
 *   site root;
 * - `relativePath` makes each page's `contextmap.svg` resolve beside it;
 * - only the root has a `_sidebar.md`, and docsify otherwise asks for one in
 *   every folder on the way up, so `alias` points them all at the real one.
 */
export function indexHtml(workspace: Workspace): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(workspace.name)}</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css">
</head>
<body>
	<div id="app"></div>
	<script>
		if (!location.hash) location.hash = ${JSON.stringify(`#/${pathToIndexMd(workspace.path)}`)};
		window.$docsify = {
			name: ${JSON.stringify(workspace.name)},
			loadSidebar: true,
			alias: { "/.*/_sidebar.md": "/_sidebar.md" },
			relativePath: true,
			subMaxLevel: 2
		};
	</script>
	<script src="https://cdn.jsdelivr.net/npm/docsify@4"></script>
</body>
</html>
`;
}
