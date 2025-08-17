import react from "@vitejs/plugin-react";
// import Sonda from "sonda/vite";
import { defineConfig } from "vite";
import viteCopyPlugin from "./vite-copy.plugin.ts";

// https://vite.dev/config/
export default defineConfig({
	build: {
		// sourcemap: true,
		chunkSizeWarningLimit: 2_000,
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom"],
					mantine: [
						"@mantine/code-highlight",
						"@mantine/colors-generator",
						"@mantine/core",
						"@mantine/hooks",
						"@mantine/notifications",
						"@mantine/spotlight",
					],
					graphviz: ["@hpcc-js/wasm-graphviz", "@hpcc-js/wasm"],
				},
			},
		},
	},
	plugins: [
		// Sonda(),
		react(),
		viteCopyPlugin(),
	],
});
