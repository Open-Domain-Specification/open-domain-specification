import type { WorkspaceSet } from "@open-domain-specification/core";

/** The shape of a team's `published` list: refs by the kind of element they name. */
type Surface = Partial<
	Record<
		| "aggregates"
		| "attributes"
		| "consumables"
		| "contexts"
		| "entities"
		| "policies"
		| "processes"
		| "schemas"
		| "services"
		| "subdomains"
		| "valueobjects",
		readonly string[]
	>
>;

type RefOf<S, K extends string> = S extends {
	readonly [P in K]: readonly (infer R)[];
}
	? R
	: never;

/**
 * Reads another team's workspace from the set by the refs that team publishes.
 *
 * `S` is that team's `Published` type, imported with `import type`, so a ref
 * outside the list does not type-check and no team module imports another at
 * run time. The refs are the owning file's own pointers, so nothing here is a
 * second resolver: the lookup is the workspace's own `get...ByRefOrThrow`.
 */
export function foreign<S extends Surface>(set: WorkspaceSet, file: string) {
	const ws = set.byPath(file);
	if (!ws) throw new Error(`${file} is not in the set`);
	return {
		aggregate: (ref: RefOf<S, "aggregates">) =>
			ws.getAggregateByRefOrThrow(ref),
		attribute: (ref: RefOf<S, "attributes">) =>
			ws.getAttributeByRefOrThrow(ref),
		consumable: (ref: RefOf<S, "consumables">) =>
			ws.getConsumableByRefOrThrow(ref),
		context: (ref: RefOf<S, "contexts">) =>
			ws.getBoundedContextByRefOrThrow(ref),
		entity: (ref: RefOf<S, "entities">) => ws.getEntityByRefOrThrow(ref),
		policy: (ref: RefOf<S, "policies">) => ws.getPolicyByRefOrThrow(ref),
		process: (ref: RefOf<S, "processes">) => ws.getProcessByRefOrThrow(ref),
		schema: (ref: RefOf<S, "schemas">) => ws.getSchemaByRefOrThrow(ref),
		service: (ref: RefOf<S, "services">) => ws.getServiceByRefOrThrow(ref),
		subdomain: (ref: RefOf<S, "subdomains">) =>
			ws.getSubdomainByRefOrThrow(ref),
		valueobject: (ref: RefOf<S, "valueobjects">) =>
			ws.getValueObjectByRefOrThrow(ref),
	};
}
