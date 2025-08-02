import type { ContextRelationshipType } from "./ContextRelationshipType";

export type ContextRelationship = {
	type: ContextRelationshipType;
	target: string;
	notes?: string;
};
