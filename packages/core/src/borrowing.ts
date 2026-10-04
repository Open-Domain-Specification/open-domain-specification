import type { DownstreamRole } from "./schema";
import type { Scope } from "./scope";
import { type BoundedContext, isDirectedRelationshipType } from "./workspace";

/**
 * Where a borrowing is looked for: anything that lists relationships, which is
 * a workspace read alone or a {@link Scope} across a set.
 */
type Relating = Pick<Scope, "relationships">;

/** Whether the two contexts declare a shared kernel with one another. */
export function sharesKernelWith(
	workspace: Relating,
	one: BoundedContext,
	other: BoundedContext,
): boolean {
	return workspace.relationships.some(
		(r) => r.type === "shared-kernel" && r.involves(one) && r.involves(other),
	);
}

/**
 * Whether `downstream` has declared the given role toward `upstream`: a
 * directed relationship from the one to the other whose `downstreamRoles`
 * carry it (decision 03).
 *
 * The direction is the whole of it. A downstream is the side that takes the
 * other's model — as it stands, or translated — so the borrowing runs
 * downstream from upstream and never the other way: the upstream owes the
 * downstream nothing and must not be shaped by it.
 */
export function downstreamRoleToward(
	workspace: Relating,
	downstream: BoundedContext,
	upstream: BoundedContext,
	role: DownstreamRole,
): boolean {
	return workspace.relationships.some(
		(r) =>
			isDirectedRelationshipType(r.type) &&
			r.source === upstream &&
			r.target === downstream &&
			r.downstreamRoles.includes(role),
	);
}

/** Whether `downstream` has declared itself a conformist of `upstream`. */
function conformsTo(
	workspace: Relating,
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	return downstreamRoleToward(workspace, downstream, upstream, "conformist");
}

/**
 * A customer is the downstream of a customer-supplier relationship. The pair
 * has negotiated the interface between them, and the customer has a say in
 * what the supplier builds. The relationship type grants borrowing without a
 * downstream role: decision 03's amendment of 2026-09-10 stopped asking this
 * customer to declare itself a conformist, the downstream with no say.
 */
function isCustomerOf(
	workspace: Relating,
	customer: BoundedContext,
	supplier: BoundedContext,
): boolean {
	return workspace.relationships.some(
		(r) =>
			r.type === "customer-supplier" &&
			r.source === supplier &&
			r.target === customer,
	);
}

/**
 * Whether `borrower` may name a schema or value object declared by `owner`.
 * Three declarations say it may, and everything else stays sealed (decisions
 * 16 and 03). A shared kernel is symmetric. Conformist and customer-supplier
 * borrowing run from the upstream or supplier to its downstream, never in
 * reverse. A customer may hold a supplier's published types because it helped
 * agree that interface; calling it a conformist would contradict decision 03.
 * A partnership is deliberately not a fourth route: planning and releasing
 * together does not mean keeping one model. Partners that share a shape must
 * also declare a shared kernel. An ACL role alone grants no borrowing either.
 * The validator and derived usage lists share this answer.
 */
export function mayBorrowFrom(
	workspace: Relating,
	borrower: BoundedContext,
	owner: BoundedContext,
): boolean {
	return (
		sharesKernelWith(workspace, borrower, owner) ||
		conformsTo(workspace, borrower, owner) ||
		isCustomerOf(workspace, borrower, owner)
	);
}
