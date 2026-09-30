// Run by run.cjs under a real Mocha, one scenario at a time (ODS_SCENARIO), to
// get the record the results reporter writes for each outcome the checker must
// tell apart. `this.retries(1)` is what makes the first attempt a `retry` event
// and not a failure.
const scenario = process.env.ODS_SCENARIO;
let attempts = 0;

describe("fixture", function () {
	this.retries(1);

	it("a clean pass", () => {});

	if (scenario === "retried")
		it("passes only on its retry", () => {
			attempts++;
			if (attempts === 1) throw new Error("first attempt fails");
		});

	if (scenario === "failing")
		it("fails every attempt", () => {
			throw new Error("always fails");
		});
});
