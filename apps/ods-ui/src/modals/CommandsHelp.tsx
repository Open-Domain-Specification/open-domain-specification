import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Commands (The Verbs of an Aggregate)**

A **command** is an intention to change an aggregate. It is named in the
imperative (\`PlaceOrder\`, \`ApproveOrder\`) and carries the **attributes**
the aggregate needs to decide whether to accept it.

* A command **may be rejected** when it would break an invariant.
* When accepted it changes state and **raises one or more domain events**.
* It is the only way to change the aggregate; nothing edits state directly.

---

### **Commands, events and operations**

* **Command** – "please do this" (input, may fail)
* **Event** – "this happened" (output, a fact)
* **Operation** – the contract that exposes a command to *other contexts*

Model the command on the aggregate first; expose it through an operation
only when another context needs to call it.
`;

export function CommandsHelp() {
	return <HelpModalWithButton title={"Commands"} content={help} />;
}
