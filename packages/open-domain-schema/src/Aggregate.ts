import type { Entity } from "./Entity";
import type { ValueObject } from "./ValueObject";

export type Aggregate = {
	id: string;
	name: string;
	description: string;
	entities: Entity[];
	valueObjects?: ValueObject[];
	invariants?: {
		id: string;
		name: string;
		description?: string;
	}[];
	operations?: {
		id: string;
		name: string;
		description?: string;
	}[];
	events?: {
		id: string;
		name: string;
		description?: string;
	}[];
};
