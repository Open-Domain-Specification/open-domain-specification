import { Typography } from "@mantine/core";
import { marked } from "marked";

export type MarkdownProps = {
	content: string;
};
export function Markdown(props: MarkdownProps) {
	const htmlContent = marked(props.content) as string;

	// biome-ignore lint/security/noDangerouslySetInnerHtml: // We trust the content is safe to render as HTML
	return <Typography dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
