import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

// Serves a folder the way any static host would: no rewrites, no index magic beyond index.html.
const [port, root] = [Number(process.argv[2]), process.argv[3]];
const types = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".ttf": "font/ttf",
	".svg": "image/svg+xml",
};
createServer((req, res) => {
	const url = new URL(req.url ?? "/", "http://x");
	let file = normalize(join(root, decodeURIComponent(url.pathname)));
	if (existsSync(file) && statSync(file).isDirectory())
		file = join(file, "index.html");
	if (!file.startsWith(normalize(root)) || !existsSync(file)) {
		res.writeHead(404).end();
		return;
	}
	res.writeHead(200, {
		"content-type": types[extname(file)] ?? "application/octet-stream",
	});
	createReadStream(file).pipe(res);
}).listen(port);
