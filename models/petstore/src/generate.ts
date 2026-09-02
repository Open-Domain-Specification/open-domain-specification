import { generate } from "@open-domain-specification/model-tools";
import { workspace } from "./workspace.ts";

// The petstore keeps its historical file name because tests and the pages
// fixtures reference `.ods/petstore.json`, not the workspace's own id.
await generate(workspace, { file: "petstore" });
