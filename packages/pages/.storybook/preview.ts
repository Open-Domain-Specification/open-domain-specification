import type { Preview } from "@storybook/svelte-vite";
import "../assets/codicons/codicon.css";
import "../assets/site.css";
import "../assets/page.css";
import ModelDecorator from "./ModelDecorator.svelte";

// Wraps every story in a <ModelProvider> so components that call `useModel()`
// don't crash when Storybook renders the meta `component` directly (autodocs,
// HMR, or a story with no body). Stories that provide their own model via
// <ModelProvider> in their body still take precedence for their own content.
const preview: Preview = {
	parameters: {
		layout: "padded",
		// Story args here often carry live ODS model objects (Workspace,
		// Aggregate, ...), which are graphs with back-references and are not
		// JSON-serializable. addon-svelte-csf's dynamic "Code" doc-block tries
		// to JSON.stringify args to render a source snippet, which throws on
		// those cycles. Pin source rendering to the statically-extracted code
		// instead of the args-substituted variant.
		docs: { source: { type: "code" } },
	},
	decorators: [() => ModelDecorator],
};
export default preview;
