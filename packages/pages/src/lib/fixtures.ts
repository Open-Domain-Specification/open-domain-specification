import { Workspace } from "@open-domain-specification/core";
import petstore from "../../../ods-example-ws/.ods/petstore.json";
import { dotToSvg } from "../graphviz";
import type { Model } from "./model";

/** The petstore example as a model, for stories and component tests. */
export function petstoreModel(): Model {
	const workspace = Workspace.fromSchema(
		petstore as Parameters<typeof Workspace.fromSchema>[0],
	);
	return {
		workspace,
		fileLabel: "petstore.json",
		diagnostics: workspace.validate(),
		renderDot: dotToSvg,
	};
}
