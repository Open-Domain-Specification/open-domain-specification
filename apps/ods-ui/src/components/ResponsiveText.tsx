import { Text, type TextProps } from "@mantine/core";
import type { ReactNode } from "react";
import { useIsMobile } from "../hooks/useIsMobile.ts";

export function ResponsiveText(props: TextProps & { children?: ReactNode }) {
	const isMobile = useIsMobile();

	const size: TextProps["size"] = props.size || (isMobile ? "sm" : "md");

	return <Text {...props} size={size} />;
}
