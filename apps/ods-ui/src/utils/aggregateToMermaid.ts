import type { Aggregate, Workspace } from "open-domain-schema";

export function aggregateToMermaid(
	_workspace: Workspace,
	aggregate: Aggregate,
): string {
	console.log(aggregate);
	const relations: string[] = [];
	const entities: string[] = [];
	const valueObjects: string[] = [];

	for (const entity of aggregate.entities) {
		const id = entity.id;
		const name = entity.name;

		entities.push(
			`\t${id}["<b>${name}</b><br/>«<small>Entity</small>»"]:::entity`,
		);

		for (const relationship of entity.relations ?? []) {
			const target = relationship.target;
			const label = relationship.label;
			const relation = relationship.relation;

			relations.push(
				`\t${id} ${relation} ${target}${label ? `: "${label}"` : ""}`,
			);
		}
	}

	for (const valueObject of aggregate.valueObjects ?? []) {
		const id = valueObject.id;
		const name = valueObject.name;

		valueObjects.push(
			`\t${id}["<b>${name}</b><br/>«<small>Value Object</small>»"]:::value_object`,
		);

		for (const relationship of valueObject.relations ?? []) {
			const target = relationship.target;
			const label = relationship.label;
			const relation = relationship.relation;

			relations.push(
				`\t${id} ${relation} ${target}${label ? `: "${label}"` : ""}`,
			);
		}
	}

	const text = [
		`erDiagram`,
		`\tdirection TB`,
		...entities,
		...valueObjects,
		...relations,
		`\tclassDef entity stroke-solid`,
		`\tclassDef value_object stroke-dasharray: 10,rx: 20,ry: 200`,
	].join("\n");

	console.log(text);

	return text;
}
