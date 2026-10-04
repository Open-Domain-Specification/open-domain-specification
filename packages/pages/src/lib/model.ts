import type { Diagnostic, Workspace } from "@open-domain-specification/core";
import { getContext, setContext } from "svelte";

/** What every component can reach: the workspace, its diagnostics and where it came from. */
export type Model = {
	workspace: Workspace;
	fileLabel: string;
	diagnostics: Diagnostic[];
};

const KEY = Symbol("ods-model");

export const provideModel = (model: Model) => setContext(KEY, model);
export const useModel = (): Model => {
	const model = getContext<Model | undefined>(KEY);
	if (!model)
		throw new Error(
			"No ODS model in context; wrap the page in <ModelProvider>.",
		);
	return model;
};

/** Diagnostics about an element or anything inside it. */
export const problemsUnder = (model: Model, ref: string) =>
	model.diagnostics.filter((d) => d.ref === ref || d.ref.startsWith(`${ref}/`));

/** Display name of any referenceable element, falling back to its ref. */
export const nameOf = (t: { ref: string; name?: string }): string =>
	t.name ?? t.ref;

export {
	consumableIcon,
	ICONS,
	RELATIONSHIP,
	SERVICE_TYPE,
	SUBDOMAIN_TYPE,
} from "./icons";
