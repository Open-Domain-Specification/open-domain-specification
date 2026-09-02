import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Provides (Events and Operations)**

What an aggregate or service **provides** is the only behaviour that crosses
its boundary. Each thing it provides is a **consumable** of one of two types:

* **Operation** – "please do this". Something a caller can ask this node to
  do. It may be rejected when it would break an invariant, and when accepted
  it **raises** one or more event consumables.
* **Event** – "this happened". A fact this node announces after a change has
  been applied. Events cannot be undone, only compensated for.

---

### **Internal vs published**

A consumable is **published** by default: it is offered to other bounded
contexts under an upstream role:

* **open-host-service** – a stable, documented protocol anyone may use
* **published-language** – a shared, well-defined language for the data exchanged

Consumers adopt a **downstream role** when they consume it: **conformist**
(accept the provider's model as is) or **anti-corruption-layer** (translate
into their own model).

A consumable marked **internal** stays inside its context. It carries no
upstream role and only the context's own policies and services may use it.
An internal operation is a command the outside cannot issue; an internal
event is one the outside never sees.

---

### **Schemas and raises**

* The **schema** of a consumable is its payload shape, declared once under
  the bounded context's **Schemas** so that a command and the event it
  raises can share the same shape.
* **Raises** lists, for an operation, the event consumables it may produce.
  The flow map on the context page follows these links from events through
  policies to operations and back.
`;

export function ProvidesHelp() {
	return <HelpModalWithButton title={"Provides"} content={help} />;
}
