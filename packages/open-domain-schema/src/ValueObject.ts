import type { EntityRelation } from "./EntityRelation";

export type ValueObject = {
	id: string;
	name: string;
	description?: string;
	relations?: EntityRelation[];
};
