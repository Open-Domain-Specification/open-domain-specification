import { HelpModalWithButton } from "../components/HelpModalWithButton.tsx";

const help = `\
### **Glossary (The Ubiquitous Language)**

Every bounded context has its own **ubiquitous language**: the words the
business and the team use, with one meaning inside that context. The same
word can mean something different in another context, and that is fine as
long as each context is clear about its own meaning.

Each term has:

* a **definition** in plain language,
* optional **aliases** people also use, and
* optionally the **model element that embodies it**, so the word and the
  code stay connected.

---

If a term in conversation has no entry here, add it. If two people use the
same word for different things, you may have found a context boundary.
`;

export function GlossaryHelp() {
	return <HelpModalWithButton title={"Glossary"} content={help} />;
}
