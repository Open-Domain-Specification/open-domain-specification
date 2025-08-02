import { generateColors } from "@mantine/colors-generator";
import type { MantineThemeOverride } from "@mantine/core";

export type ThemeProps = {
	primaryColor?: string;
};

export function theme(props: ThemeProps) {
	const theme: MantineThemeOverride = {
		fontFamily: "Geist Sans, sans-serif",
		fontFamilyMonospace: "Geist Mono, monospace",
	};

	if (props.primaryColor) {
		theme.colors = {
			primary: generateColors(props.primaryColor),
		};
		theme.primaryColor = "primary";
	}

	return theme;
}
