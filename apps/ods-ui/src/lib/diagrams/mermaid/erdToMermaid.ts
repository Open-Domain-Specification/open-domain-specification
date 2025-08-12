import { camelToKebabCase } from "@mantine/core";
import type { SVGAttributes, SVGProps } from "react";
import type { ERD, ERDEntity } from "../erd.ts";

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

function classesToMermaid(classes: Record<string, SVGProps<any>>): string[] {
	return Object.entries(classes).map(([classname, props]) => {
		const style = Object.entries(props)
			.map(([key, value]) => {
				if (key === "stroke") {
					return `${key}-${value}`;
				} else {
					return `${camelToKebabCase(key)}: ${value}`;
				}
			})
			.join(",");
		return `\tclassDef ${classname} ${style}`;
	});
}

const buildRow = ({
	id,
	name,
	classname,
	prototype,
}: {
	id: string;
	name: string;
	prototype: string;
	classname: string;
}) =>
	`\t${id}["<b>${name}</b><br/>«<small>${prototype}</small>»"]:::${classname}`;

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
	});
}

function erdRelationToMermaid(relation: {
	source: ERDEntity<EntityProps>;
	target: ERDEntity<EntityProps>;
	relation: string;
	label?: string;
}): string {
	return `\t${relation.source.id} ${relation.relation} ${relation.target.id}${
		relation.label ? `: "${relation.label}"` : ""
	}`;
}

export function erdToMermaid(erd: ERD<EntityProps>): string {
	const entities = erd.entities.map(erdEntityToMermaid);

	const relations = erd.relations.map(erdRelationToMermaid);

	return [
		`erDiagram`,
		`\tdirection TB`,
		...entities,
		...relations,
		`\t`,
		`\t%% ========== Class definitions for styling ==========`,
		...classesToMermaid(classes),
		`\t%% ========== End of class definitions ==========`,
	].join("\n");
}
