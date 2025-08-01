import { HelpModalWithButton } from "./HelpModalWithButton.tsx";

const help = `\
In **Domain-Driven Design (DDD)**, **operations** are the **things an aggregate can do**.
They represent **business actions** that:

1. **Change the aggregate’s state**, and
2. **Respect its invariants** (the “rules that must always be true”).

Think of them as the **verbs of your domain**.

---

### **Key Points About Operations**

* They are **business-focused**, not technical.

  * ✅ \`ConfirmOrder()\` → clear, domain action
  * ❌ \`SetStatus("Confirmed")\` → just a technical update

* They **enforce rules before changing state**.

  * If an operation would break an invariant, it should **fail**.

* They are **the only way external code can modify an aggregate**.

  * This keeps your model consistent and prevents accidental invalid states.

---

### **Examples of Operations**

1. **Bank Account Aggregate**

   * \`Deposit(amount)\` → Increases balance
   * \`Withdraw(amount)\` → Fails if it would go below zero

2. **Order Aggregate**

   * \`AddItem(productId, quantity)\` → Adds a line item
   * \`ConfirmOrder()\` → Only allowed if the order has at least one item

3. **Conference Registration Aggregate**

   * \`RegisterAttendee(attendeeId)\` → Adds an attendee if there’s space
   * \`CancelRegistration(attendeeId)\` → Frees up a spot

---

### **How to Identify Operations**

Ask yourself:

* *“What meaningful things can this aggregate do in the business?”*
* *“What actions should never be allowed from the outside?”*

These answers often map directly to your **aggregate operations**.
`;

export function OperationsHelp() {
	return <HelpModalWithButton content={help} title={"Operations"} />;
}
