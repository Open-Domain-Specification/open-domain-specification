import { Typography } from "@mantine/core";
import { marked } from "marked";
import { useIsMobile } from "../hooks/useIsMobile.ts";

export type MarkdownProps = {
	content: string;
};
export function Markdown(props: MarkdownProps) {
	const htmlContent = marked(props.content) as string;
	const isMobile = useIsMobile();

	return (
		<Typography
			// biome-ignore lint/security/noDangerouslySetInnerHtml: // We trust the content is safe to render as HTML
			dangerouslySetInnerHTML={{ __html: htmlContent }}
			fz={isMobile ? "sm" : undefined}
		/>
	);
}
