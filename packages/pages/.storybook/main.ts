import type { StorybookConfig } from "@storybook/svelte-vite";

const config: StorybookConfig = {
	framework: "@storybook/svelte-vite",
	stories: ["../src/lib/**/*.stories.svelte"],
	addons: ["@storybook/addon-svelte-csf"],
};
export default config;
