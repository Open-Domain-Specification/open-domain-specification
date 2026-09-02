import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Policies (When This, Then That)**

A **policy** is a reaction: *when* certain **event consumables** happen,
*then* issue certain **operation consumables**. On an event-storming wall it
is the lilac sticky between an orange event and a blue command.

* Policies live on a **bounded context**, because they often coordinate
  more than one aggregate.
* The events they react to and the operations they issue **may belong to
  other contexts**; that is how a saga or process manager spans contexts.
  Internal consumables may only be used by their own context's policies.
* The **flow map** on this page walks from each policy through the events
  it reacts to, the operations it issues and the events those raise.

---

### **Examples**

* *When* \`OrderPlaced\` *then* \`ReserveStock\`
* *When* \`PaymentFailed\` *then* \`CancelOrder\`, \`NotifyCustomer\`
`;

export function PoliciesHelp() {
	return <HelpModalWithButton title={"Policies"} content={help} />;
}
