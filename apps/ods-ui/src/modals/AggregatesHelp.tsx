import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Aggregates (Your Consistency Guardians)**

In **Domain-Driven Design (DDD)**, an **Aggregate** is a **cluster of related Entities and Value Objects** that is **treated as a single unit** for:

* **Consistency** – making sure your business rules (invariants) always hold true
* **Persistence** – usually saved and loaded together from a database
* **Business logic** – the place where operations happen safely

Think of an **aggregate** as a **protective bubble** around a small piece of your domain.

---

### **Key Concepts**

1. **Aggregate Root**

   * The **main Entity** that represents the whole aggregate.
   * **All access goes through the root**—outside code cannot change inner entities directly.
   * Example:

     * \`Order\` is the aggregate root.
     * \`OrderLine\` is an entity inside the aggregate.

2. **Aggregate Boundaries**

   * Everything **inside the boundary** is guaranteed to be **consistent** together.
   * Outside code **shouldn’t reach in** to modify things directly.

3. **Invariants Live Here**

   * Aggregates **enforce the rules that must always be true**.
   * All **Operations** that could break those rules **happen inside the aggregate**.

---

### **Examples of Aggregates**

1. **Order Aggregate**

   * **Root:** \`Order\`
   * **Entities:** \`OrderLine\`
   * **Value Objects:** \`Money\`, \`ShippingAddress\`
   * **Invariants:**

     * An order cannot be confirmed without at least one line item.

2. **Bank Account Aggregate**

   * **Root:** \`Account\`
   * **Entities:** None inside (single-entity aggregate)
   * **Value Objects:** \`Money\`
   * **Invariants:**

     * Balance cannot go below zero (unless overdraft is allowed).

3. **Conference Aggregate**

   * **Root:** \`Conference\`
   * **Entities:** \`Attendee\`
   * **Value Objects:** \`VenueCapacity\`
   * **Invariants:**

     * Registered attendees cannot exceed the venue capacity.

---

### **How Aggregates Keep Your Domain Safe**

* **External code only interacts with the Aggregate Root**
* **Operations happen inside the aggregate**
* **Invariants are always checked before changing state**

> **Think of an aggregate as a “self-policing mini-domain” that guarantees its own correctness.**
`;

export function AggregatesHelp() {
	return <HelpModalWithButton content={help} title={"Aggregates"} />;
}
