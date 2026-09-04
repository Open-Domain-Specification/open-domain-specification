import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { kindOf } from "./element-kind";

const ws = petstoreModel().workspace;
const bc = ws.boundedcontexts.get("catalog_bc");
if (!bc) throw new Error("the petstore fixture lost catalog_bc");
const aggregate = bc.aggregates.get("pet");
if (!aggregate) throw new Error("the petstore fixture lost the Pet aggregate");
const domain = [...ws.domains.values()][0];

describe("kindOf", () => {
	it("names every kind the pages link to", () => {
		expect(kindOf([...aggregate.entities.values()][0])).toBe("entity");
		expect(kindOf([...bc.valueobjects.values()][0])).toBe("valueobject");
		expect(kindOf(aggregate)).toBe("aggregate");
		expect(kindOf([...bc.services.values()][0])).toBe("service");
		expect(kindOf(bc)).toBe("boundedcontext");
		expect(kindOf([...domain.subdomains.values()][0])).toBe("subdomain");
		expect(kindOf(domain)).toBe("domain");
		expect(kindOf([...bc.schemas.values()][0])).toBe("schema");
		expect(
			kindOf(
				[...ws.boundedcontexts.values()].flatMap((c) => [
					...c.policies.values(),
				])[0],
			),
		).toBe("policy");
		expect(kindOf([...aggregate.invariants.values()][0])).toBe("invariant");
		expect(kindOf([...bc.glossary.values()][0])).toBe("term");
		expect(kindOf([...ws.teams.values()][0])).toBe("team");
	});

	it("splits consumables by what they are, as the design language colours them", () => {
		const consumables = [...aggregate.consumables.values()];
		const event = consumables.find((c) => c.type === "event");
		const operation = consumables.find((c) => c.type === "operation");
		expect(kindOf(event)).toBe("event");
		expect(kindOf(operation)).toBe("command");
	});

	it("falls back to the neutral consumable glyph for anything else", () => {
		expect(kindOf({ ref: "#/something/new" })).toBe("consumable");
	});
});
