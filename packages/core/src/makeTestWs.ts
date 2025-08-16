import { Workspace } from "./workspace";

export function makeTestWs() {
	const ws = new Workspace("WS", {
		odsVersion: "1.0.0",
		description: "Demo",
		version: "test",
	});

	const d1 = ws.addDomain("D1", {
		description: "",
		type: "core",
	});

	const d1Sd1 = d1.addSubdomain([d1.name, "SD1"].join("."), {
		description: "",
	});

	const d1Sd1Bc1 = d1Sd1.addBoundedcontext([d1Sd1.name, "BC1"].join("."), {
		description: "",
	});

	const d1Sd1Bc1S1 = d1Sd1Bc1.addService([d1Sd1Bc1.name, "S1"].join("."), {
		type: "domain",
		description: "",
	});

	const d1Sd1Bc1S1C1 = d1Sd1Bc1S1.addConsumable(
		[d1Sd1Bc1S1.name, "C1"].join("."),
		{
			description: "",
			pattern: "open-host-service",
			type: "operation",
		},
	);

	const d1Sd1Bc1Ag1 = d1Sd1Bc1.addAggregate([d1Sd1Bc1.name, "Ag1"].join("."), {
		description: "",
	});

	const d1Sd1Bc1Ag1I1 = d1Sd1Bc1Ag1.addInvariant(
		[d1Sd1Bc1Ag1.name, "I1"].join("."),
		{
			description: "",
		},
	);

	const d1Sd1Bc1S1Ag1E1 = d1Sd1Bc1Ag1.addEntity(
		[d1Sd1Bc1Ag1.name, "E1"].join("."),
		{
			description: "",
		},
	);

	const d1Sd1Bc1Ag1Vo1 = d1Sd1Bc1Ag1.addValueObject(
		[d1Sd1Bc1Ag1.name, "Vo1"].join("."),
		{
			description: "",
		},
	);

	const d2 = ws.addDomain("D2", {
		description: "",
		type: "core",
	});

	const d2Sd1 = d2.addSubdomain([d2.name, "SD1"].join("."), {
		description: "",
	});

	const d2Sd1Bc1 = d2Sd1.addBoundedcontext([d2Sd1.name, "BC1"].join("."), {
		description: "",
	});

	const d2Sd1Bc1S1 = d2Sd1Bc1.addService([d2Sd1Bc1.name, "S1"].join("."), {
		type: "domain",
		description: "",
	});

	const d2Sd1Bc1S1Co1 = d2Sd1Bc1S1.addConsumption(d1Sd1Bc1S1C1, {
		pattern: "conformist",
	});

	const d2Sd1Bc1S1Ag1 = d2Sd1Bc1.addAggregate(
		[d2Sd1Bc1.name, "Ag1"].join("."),
		{
			description: "",
		},
	);

	const d2Sd1Bc1S1Ag1E1 = d2Sd1Bc1S1Ag1.addEntity(
		[d2Sd1Bc1S1Ag1.name, "E1"].join("."),
		{
			description: "",
		},
	);

	const d2Sd1Bc1S1Ag1Vo1 = d2Sd1Bc1S1Ag1.addValueObject(
		[d2Sd1Bc1S1Ag1.name, "Vo1"].join("."),
		{
			description: "",
		},
	);

	return {
		ws,
		d1,
		d1Sd1,
		d1Sd1Bc1,
		d1Sd1Bc1S1,
		d1Sd1Bc1S1C1,
		d1Sd1Bc1Ag1,
		d1Sd1Bc1Ag1I1,
		d1Sd1Bc1S1Ag1E1,
		d1Sd1Bc1Ag1Vo1,
		d2,
		d2Sd1,
		d2Sd1Bc1,
		d2Sd1Bc1S1,
		d2Sd1Bc1S1Co1,
		d2Sd1Bc1S1Ag1,
		d2Sd1Bc1S1Ag1E1,
		d2Sd1Bc1S1Ag1Vo1,
	};
}
