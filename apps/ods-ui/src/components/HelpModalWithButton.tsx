import { ActionIcon, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { VscQuestion } from "react-icons/vsc";
import { Markdown } from "./Markdown.tsx";

const help = `\
An **invariant** is a rule that must **always be true** in your domain model.
Think of it as a **promise your system cannot break** if it wants to stay in a valid state.

In **Domain-Driven Design (DDD)**, we often talk about **aggregate invariants**. These are the rules that must **always hold true for an entire aggregate**—not just a single entity.

If an invariant is broken, it usually means your model has become **inconsistent**, which can lead to bugs, data corruption, or business rule violations.

---

### **Simple Examples of Invariants**

1. **Bank Account Aggregate**

   * Invariant: The account balance can **never go below zero** (unless overdraft is allowed).
   * Why: If a withdrawal would break this rule, the operation must fail.

2. **E-commerce Order Aggregate**

   * Invariant: An order that is marked as **“Shipped”** must have at least one **line item**.
   * Why: You cannot ship an empty order.

3. **Conference Registration Aggregate**

   * Invariant: The **number of registered attendees** cannot **exceed the venue capacity**.
   * Why: Overbooking would violate a core business rule.

---

### **How to Think About Invariants**

When defining an aggregate, ask yourself:

* “**What conditions must always be true** for this aggregate to be valid?”
* “**What business rules can never be broken**, no matter what sequence of operations happens?”

Then, enforce those rules **inside the aggregate** so that no external action can leave it in an invalid state.
`;

export function InvariantsHelp() {
	const [isOpen, open] = useDisclosure();

	return (
		<>
			<ActionIcon variant={"subtle"} onClick={open.open}>
				<VscQuestion />
			</ActionIcon>
			<Modal
				title={
					<Text fz={"lg"} fw={"bold"}>
						Invariants Help
					</Text>
				}
				size={"xl"}
				opened={isOpen}
				onClose={open.close}
			>
				<Markdown content={help} />
			</Modal>
		</>
	);
}
