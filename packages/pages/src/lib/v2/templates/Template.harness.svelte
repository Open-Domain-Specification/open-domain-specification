<script lang="ts">
import { petstoreModel } from "../../fixtures";
import ModelProvider from "../../ModelProvider.svelte";
import PageLayout from "../PageLayout.svelte";
import Theme from "../Theme.harness.svelte";
import Strategic, {
	type PageName,
	sectionsOf,
} from "./Strategic.harness.svelte";

/**
 * One v2 template, in one theme, inside the page layout it ships in — the two
 * columns and the table of contents, so a story shows what the editor tab
 * shows and not a component on a white field.
 */
const {
	page,
	mode = "light",
}: { page: PageName; mode?: "light" | "dark" | "hc" } = $props();

const model = petstoreModel();
</script>

<Theme {mode}>
	<ModelProvider {model}>
		<PageLayout sections={sectionsOf(page)}>
			<Strategic {page} ws={model.workspace} />
		</PageLayout>
	</ModelProvider>
</Theme>
