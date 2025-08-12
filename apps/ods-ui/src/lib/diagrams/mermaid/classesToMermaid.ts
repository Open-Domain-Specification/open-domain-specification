import { camelToKebabCase } from "@mantine/core";
import type { SVGProps } from "react";

export function classesToMermaid(
	classes: Record<string, SVGProps<any>>,
): string[] {
	return [
		`\t%% ========== Class definitions for styling ==========`,
		...Object.entries(classes).map(([classname, props]) => {
			const style = Object.entries(props)
				.map(([key, value]) => {
					if (key === "stroke") {
						return `${key}-${value}`;
					} else {
						return `${camelToKebabCase(key)}: ${value}`;
					}
				})
				.join(",");
			return `\tclassDef ${classname} ${style}`;
		}),
		`\t%% ========== End of class definitions ==========`,
	];
}
