import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Policies (When This, Then That)**

A **policy** is a reaction: *when* certain domain events happen, *then*
issue certain commands. On an event-storming wall it is the lilac sticky
between an orange event and a blue command.

* Policies live on a **bounded context**, because they often coordinate
  more than one aggregate.
* The events they react to and the commands they issue **may belong to
  other contexts**; that is how a saga or process manager spans contexts.
* The **flow map** on this page walks from each policy through the events
  it reacts to, the commands it issues and the events those raise.

---

### **Examples**

* *When* \`OrderPlaced\` *then* \`ReserveStock\`
* *When* \`PaymentFailed\` *then* \`CancelOrder\`, \`NotifyCustomer\`
`;

export function PoliciesHelp() {
	return <HelpModalWithButton title={"Policies"} content={help} />;
}
