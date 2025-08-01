import { HelpModalWithButton } from "./HelpModalWithButton.tsx";

const help = `\

In **Domain-Driven Design (DDD)**, the two most fundamental building blocks are **Entities** and **Value Objects**.
They describe the **things in your domain** and how you **reason about changes over time**.

---

## **Entities – Defined by Identity**

An **Entity** is something that **matters because of its identity**, not just its data.

* **Identity is the key**

  * An Entity has a **unique ID** that distinguishes it from all others.
  * Its **identity remains the same even if its data changes**.

* **Not tied to a database**

  * Entities **don’t have to live in a database** to be Entities.
  * They can exist **in memory, in a cache, in a message queue, or be short-lived**.
  * **If it carries identity and can be tracked as the same thing, it’s an Entity.**

* **Changes over time**

  * You can update an Entity’s fields (e.g., an email address), and it’s **still the same Entity**.

**Examples:**

1. **Customer** – Same customer, even if their address changes.
2. **Bank Account** – Same account whether in the DB, in memory, or serialized in a message.
3. **Shopping Cart** – Exists with an ID before checkout; still an Entity.

> **Pro Tip:** If the system cares about “which one” it is, model it as an Entity.

---

## **Value Objects – Defined by Their Values**

A **Value Object** is something that is **defined entirely by its data**.

* **No unique identity**

  * If two Value Objects have the **same values**, they are **the same**.

* **Immutable by design (usually)**

  * You don’t change a Value Object; you **replace it** with a new one.

* **Ideal for expressing domain concepts and constraints**

  * Helps keep your domain **precise and self-validating**.

**Examples:**

1. **Money** – \`$10 USD\` is the same anywhere.
2. **Address** – \`"123 Main St"\` is the same as another with identical fields.
3. **Date Range** – \`"Jan 1 – Jan 7"\` is the same as any other with those exact dates.

> **Pro Tip:** If the system only cares about the data, not “which one” it is, model it as a Value Object.

---

## **Quick Comparison**

| Aspect       | Entity                          | Value Object        |
| ------------ | ------------------------------- | ------------------- |
| **Identity** | Has unique ID                   | No ID               |
| **Equality** | By ID                           | By value            |
| **Lifespan** | Can change over time            | Immutable (usually) |
| **Storage**  | DB, cache, in-memory, etc		 | Anywhere            |
| **Use Case** | Trackable domain concept        | Descriptive concept |

---

### **When to Use Each**

* Use an **Entity** when the object’s **identity and lifecycle** matter.
* Use a **Value Object** when the object is just **a description or measurement** with no independent lifecycle.

---

### **Putting It Together**

* An **Order (Entity)** might contain **LineItems (Entities)**, and each LineItem might include a **Price (Value Object)**.
* **Entities hold identity and change over time.**
* **Value Objects describe things and make your model precise.**
`;

export function EntitiesAndValueObjectsHelp() {
	return (
		<HelpModalWithButton content={help} title={"Entities and Value Objects"} />
	);
}
