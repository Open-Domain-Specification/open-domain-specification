import {
	type Diagnostic,
	type Workspace,
	type WorkspaceSet,
	workspaceOf,
} from "@open-domain-specification/core";
import { getContext, setContext } from "svelte";
import type { LoadedSet } from "./load";
import { qualifies, routeIn } from "./route";

/**
 * What every component can reach: the workspace whose page is open, its
 * diagnostics and where it came from. In a set it is the model of one file,
 * and `loaded` is the set it is read in.
 */
export type Model = {
	workspace: Workspace;
	fileLabel: string;
	/** What is wrong with this workspace's file, judged by the whole set when it has one. */
	diagnostics: Diagnostic[];
	/** The set this workspace is a file of; absent for a workspace opened alone. */
	loaded?: LoadedSet;
	/** Why this is the last good load of a file whose current text does not load. */
	stale?: string;
};

const KEY = Symbol("ods-model");
const SET_KEY = Symbol("ods-set");

/** Makes a set known to what is drawn beneath, for a page that is about the set and no one workspace. */
export const provideSet = (set: WorkspaceSet) => setContext(SET_KEY, set);

/** The set a diagram's node keys are read in: the one provided, else that of the model on screen. */
export const maybeSet = (): WorkspaceSet | undefined =>
	getContext<WorkspaceSet | undefined>(SET_KEY) ??
	getContext<Model | undefined>(KEY)?.loaded?.set;

export const provideModel = (model: Model) => setContext(KEY, model);
export const useModel = (): Model => {
	const model = getContext<Model | undefined>(KEY);
	if (!model)
		throw new Error(
			"No ODS model in context; wrap the page in <ModelProvider>.",
		);
	return model;
};

/** The model in context, or undefined where none was provided (a story, a bare component). */
export const maybeModel = (): Model | undefined =>
	getContext<Model | undefined>(KEY);

/**
 * A ref a component wrote for something of the workspace on screen, as the
 * route that reaches it. Inside a set of more than one file it is named by the
 * file of that workspace; everywhere else it is the ref itself. A route that
 * already names a file is left alone.
 */
export function localRoute(model: Model | undefined, ref: string): string {
	const set = model?.loaded?.set;
	const file = model?.workspace.file;
	if (!qualifies(set) || file === undefined) return ref;
	if (ref !== "#" && !ref.startsWith("#/")) return ref;
	if (ref.startsWith("#/workspaces/")) return ref;
	return routeIn(set, file, ref);
}

/**
 * The anchor a row or heading of this page gives an element: its local ref,
 * for an element of the workspace on screen. An element of another file has
 * none, because its local ref says nothing here and may be one of this page's
 * own.
 */
export const anchorOf = (
	model: Model,
	element: { ref: string },
): string | undefined =>
	workspaceOf(element) === model.workspace ? element.ref : undefined;

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
