import {
	Avatar,
	Container,
	Group,
	Stack,
	Title,
	Typography,
} from "@mantine/core";
import { marked } from "marked";
import type { ReactNode } from "react";

export type PageSkeletonProps = {
	avatar: string | ReactNode;
	title: string;
	description: string;
	children: ReactNode;
};
export function PageSkeleton({
	avatar,
	title,
	children,
	description,
}: PageSkeletonProps) {
	const htmlDescription = marked.parse(description) as string;

	return (
		<Container p={"md"}>
			<Stack gap={"xl"}>
				<Stack>
					<Group>
						<Avatar
							src={typeof avatar === "string" ? avatar : undefined}
							name={title}
							color={"initials"}
							radius={"sm"}
						>
							{typeof avatar !== "string" ? avatar : undefined}
						</Avatar>
						<Title>{title}</Title>
					</Group>
					{/** biome-ignore lint/security/noDangerouslySetInnerHtml: Parsed Markdown */}
					<Typography dangerouslySetInnerHTML={{ __html: htmlDescription }} />
				</Stack>
				{children}
			</Stack>
		</Container>
	);
}
