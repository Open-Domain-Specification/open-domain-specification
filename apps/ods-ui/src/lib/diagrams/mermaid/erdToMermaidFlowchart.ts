import type { SVGAttributes } from "react";
import type { ERD, ERDEntity } from "../erd.ts";
import { classesToMermaid } from "./classesToMermaid.ts";
import { subgraph } from "./subgraph.ts";

export type EntityProps = {
	root: boolean;
	type: "entity" | "value_object";
	key: string;
	namespace: string[];
};

const classes: Record<string, SVGAttributes<any>> = {
	value_object: {
		strokeDasharray: "10",
		rx: "10",
		ry: "10",
	},
	entity_root: {
		stroke: "solid",
		strokeWidth: "2px",
	},
	entity: {
		stroke: "solid",
	},
};

const buildRow = ({
	id,
	name,
	classname,
	prototype,
	namespace,
}: {
	id: string;
	name: string;
	prototype: string;
	classname: string;
	namespace: string[];
}) => {
	const indent = "\t".repeat(namespace.length + 1);

	return subgraph(
		`${indent}${id}["<b>${name}</b><br/>«<small>${prototype}</small>»"]:::${classname}`,
		namespace,
	);
};

function toPrototype(props: EntityProps): string {
	switch (true) {
		case props.type === "value_object":
			return "Value Object";
		case props.type === "entity" && props.root:
			return "Root Entity";
		case props.type === "entity" && !props.root:
			return "Entity";
		default:
			throw new Error("Unknown entity type");
	}
}

function toClassname(props: EntityProps): keyof typeof classes {
	switch (true) {
		case props.type === "value_object":
			return "value_object";
		case props.type === "entity" && props.root:
			return "entity_root";
		case props.type === "entity" && !props.root:
			return "entity";
		default:
			throw new Error("Unknown entity type");
	}
}

function erdEntityToMermaid(entity: ERDEntity<EntityProps>): string {
	return buildRow({
		id: entity.id,
		name: entity.name,
		prototype: toPrototype(entity.props),
		classname: toClassname(entity.props),
		namespace: entity.props.namespace,
	});
}

function erdRelationToMermaid(relation: {
	source: ERDEntity<EntityProps>;
	target: ERDEntity<EntityProps>;
	relation: string;
	label?: string;
}): string {
	return `\t${relation.source.id} -->|${
		relation.label ? `"${relation.label}"` : ""
	}| ${relation.target.id}`;
}

export function erdToMermaidFlowchart(erd: ERD<EntityProps>): string {
	const entities = erd.entities.map(erdEntityToMermaid);
	const relations = erd.relations.map(erdRelationToMermaid);

	return [
		`flowchart TD`,
		...entities,
		...relations,
		...classesToMermaid(classes),
	].join("\n");
}
