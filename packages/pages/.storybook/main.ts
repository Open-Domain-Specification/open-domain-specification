import type { StorybookConfig } from "@storybook/svelte-vite";

/**
 * The app's Vite config registers `ods-classic-script`, which fails the build
 * unless the bundle is exactly one chunk: the static export has to open from
 * `file://`, where module scripts are blocked, so the app must stay a single
 * classic script. Storybook shares that config and legitimately code-splits —
 * one chunk per story — so the plugin has to come off for this build only.
 * Nothing shipped changes: `.storybook/` is not in the package's `files`.
 */
const config: StorybookConfig = {
	framework: "@storybook/svelte-vite",
	stories: ["../src/lib/**/*.stories.svelte"],
	addons: ["@storybook/addon-svelte-csf"],
	viteFinal: (config) => ({
		...config,
		plugins: (config.plugins ?? []).filter(
			(plugin) =>
				!(
					plugin &&
					typeof plugin === "object" &&
					"name" in plugin &&
					plugin.name === "ods-classic-script"
				),
		),
	}),
};
export default config;
