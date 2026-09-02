import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Schemas (Payload Shapes)**

A **schema** is the shape of the data an event or operation carries. It is
declared once on the bounded context and referenced by any number of the
context's consumables, much like \`components/schemas\` in OpenAPI.

* Schemas belong to the **context**, not the workspace: a payload is part of
  the context's published language and the same word may mean different
  things elsewhere.
* An operation and the event it raises commonly **share** one schema.
* Attributes describe a **message**, not state. Entities and value objects
  keep their own attributes; a schema attribute may reference a value
  object as its type.
`;

export function SchemasHelp() {
	return <HelpModalWithButton title={"Schemas"} content={help} />;
}
