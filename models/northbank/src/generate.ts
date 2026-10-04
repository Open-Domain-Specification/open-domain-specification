import { generate } from "@open-domain-specification/model-tools";
import { workspace } from "./workspace.ts";

await generate(workspace, { file: workspace.id });
