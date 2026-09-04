import { describe, expect, it } from "vitest";
import {
	DISPOSITION_LABELS,
	DISPOSITION_SUMMARIES,
	LINK_KIND_LABELS,
} from "./labels";

describe("evidence wording", () => {
	it("words every disposition the schema allows", () => {
		for (const d of ["by-design", "tolerated", "refactor"] as const) {
			expect(DISPOSITION_LABELS[d]).toBeTruthy();
			expect(DISPOSITION_SUMMARIES[d]).toBeTruthy();
		}
	});

	it("words every link kind the schema allows", () => {
		for (const k of [
			"code",
			"contract",
			"adr",
			"runbook",
			"dashboard",
		] as const)
			expect(LINK_KIND_LABELS[k]).toBeTruthy();
	});
});
