// node run.cjs <reporter> <output.json>: runs outcomes.cjs under the Mocha that
// @vscode/test-cli bundles (the one the real suite runs under), with the results
// reporter writing its record to <output.json>.
const { dirname, join } = require("node:path");

const testCli = require.resolve("@vscode/test-cli");
const Mocha = require(require.resolve("mocha", { paths: [dirname(testCli)] }));

const mocha = new Mocha({
	ui: "bdd",
	reporter: process.argv[2],
	reporterOptions: { output: process.argv[3] },
});
mocha.addFile(join(__dirname, "outcomes.cjs"));
mocha.run(() => {});
