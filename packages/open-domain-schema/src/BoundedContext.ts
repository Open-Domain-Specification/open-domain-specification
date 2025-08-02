import type { Aggregate } from "./Aggregate";
import type { ContextRelationship } from "./ContextRelationship";
import type { Service } from "./Service";

export type BoundedContext = {
	id: string;
	name: string;
	description: string;
	relationships?: ContextRelationship[];
	aggregates?: Aggregate[];
	services?: Service[];
};
