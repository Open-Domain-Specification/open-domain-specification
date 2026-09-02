import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Provides (The Integration Surface)**

What an aggregate or service **provides** is what *other bounded contexts* may
use. It is the published side of a context's boundary, not its internal
behaviour.

There are two kinds of consumable:

* **Operations** – things another context can ask this one to do. An
  operation usually **exposes a command** of an aggregate, but it is the
  contract offered outside, not the command itself.
* **Events** – facts this context announces. An event consumable
  **publishes a domain event** of an aggregate.

---

### **Roles**

Each consumable is offered under an **upstream role**:

* **open-host-service** – a stable, documented protocol anyone may use
* **published-language** – a shared, well-defined language for the data exchanged

Consumers adopt a **downstream role** when they consume it:

* **conformist** – the consumer accepts the provider's model as is
* **anti-corruption-layer** – the consumer translates into its own model

---

### **Commands vs operations**

Commands and events describe the aggregate from the inside; provides and
consumes describe the context from the outside. Keep the internal model rich
and the integration surface small.
`;

export function ProvidesHelp() {
	return <HelpModalWithButton title={"Provides"} content={help} />;
}
