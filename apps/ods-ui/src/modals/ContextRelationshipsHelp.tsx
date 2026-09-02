import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Context Relationships (The Context Map)**

Bounded contexts relate to each other in a handful of well-known ways:

* **upstream-downstream** – the downstream context depends on the upstream one
* **customer-supplier** – as above, and the downstream team has a say in the upstream's plans
* **partnership** – two teams plan and release together
* **shared-kernel** – two contexts share part of their model (drawn in brown)
* **separate-ways** – the two contexts deliberately do not integrate

Directed relationships also record the **roles** each side plays:
\`open-host-service\` and \`published-language\` upstream,
\`conformist\` and \`anti-corruption-layer\` downstream.

---

### **Declared and implied**

Relationships are **declared** on the workspace. Where two contexts exchange
consumables without a declaration, the map shows an **implied**
upstream-downstream edge (dashed) with the roles collected from the
consumables involved. Declaring the relationship replaces the implied edge
and is the better record of intent.
`;

export function ContextRelationshipsHelp() {
	return <HelpModalWithButton title={"Context Relationships"} content={help} />;
}
