import type { EntityRelation } from "./EntityRelation";

export type Entity = {
	root?: boolean;
	id: string;
	name: string;
	description?: string;
	relations?: EntityRelation[];
};
