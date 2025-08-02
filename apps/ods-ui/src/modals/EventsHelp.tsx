import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
An aggregate event represents something **important that has happened** within the boundary of an aggregate. Events capture **state transitions** or meaningful domain activities that occur as a result of applying a command or decision.

In Domain-Driven Design (DDD), events are not just technical signals—they're **first-class citizens** in the domain model. They document changes and communicate intent across the system.

An aggregate raises events to **express that a change has occurred**—not to cause the change. This distinction helps preserve the consistency of the model and supports event-driven architecture patterns like Event Sourcing or CQRS.

---

**Simple Examples of Aggregate Events**
**Bank Account Aggregate**
*Event:* \`MoneyWithdrawn\`
**Why:** Signals that a withdrawal was successful and the balance has changed.

**E-commerce Order Aggregate**
*Event:* \`OrderShipped\`
**Why:** Marks the order as shipped and can trigger downstream processes like fulfillment or notifications.

**Conference Registration Aggregate**
*Event:* \`AttendeeRegistered\`
**Why:** Indicates that a new person has secured a spot at the conference.

---

### **How to Think About Aggregate Events**

When designing an aggregate, ask yourself:

* “What happened that matters to the business?”
* “What story would I tell if I explained this aggregate’s life in events?”
* “Which events describe meaningful changes, not just technical side effects?”

Then, make your aggregate emit those events **only after** successfully validating and applying a command. The event should reflect what **has already happened**, not what might happen next.

---

### **Key Principles**

* Events are **facts**: once they occur, they can’t be undone—only compensated for.
* Events reflect **business language**: name them in terms that stakeholders understand.
* Events enable **replayability and audit trails**: they can reconstruct the state of an aggregate or drive other systems reactively.

---

By modeling events thoughtfully within your aggregates, you make your system more **expressive**, **traceable**, and **aligned with the business**.
`;

export function EventsHelp() {
	return <HelpModalWithButton content={help} title={"Events"} />;
}
