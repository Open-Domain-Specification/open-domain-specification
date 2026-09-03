import type { ContextRelationship } from "./workspace";

/**
 * What every surface needs to know about a relationship before it draws one.
 *
 * This is deliberately a leaf module: the diagrams, the organisms, the
 * templates, the extension's search and tree, and the doc generator all read
 * it.
 */

const SYMMETRIC = new Set(["partnership", "shared-kernel", "separate-ways"]);

/** Relationship types with no upstream or downstream side. */
export const isSymmetricRelationship = (type: string) => SYMMETRIC.has(type);

/**
 * How a relationship is named wherever it is listed — its own page, the
 * strategic position table, the search spotlight, the extension tree. A
 * relationship has no name of its own, so it is named by its two contexts
 * and the direction between them: an arrow when one side leads, a double
 * arrow when neither does.
 */
export const relationshipTitle = (r: ContextRelationship): string =>
	`${r.source.name} ${isSymmetricRelationship(r.type) ? "↔" : "→"} ${r.target.name}`;
