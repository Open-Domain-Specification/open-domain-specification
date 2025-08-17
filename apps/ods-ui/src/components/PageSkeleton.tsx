import { Avatar, Container, Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { useIsMobile } from "../hooks/useIsMobile.ts";
import { Markdown } from "./Markdown.tsx";
import { PageTitle } from "./PageTitle.tsx";

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
	const isMobile = useIsMobile();

	return (
		<Container p={"md"}>
			<Stack gap={"xl"}>
				<Stack>
					<Group wrap={"nowrap"}>
						<Avatar
							src={typeof avatar === "string" ? avatar : undefined}
							name={title}
							color={"initials"}
							radius={"sm"}
							size={isMobile ? "sm" : "md"}
						>
							{typeof avatar !== "string" ? avatar : undefined}
						</Avatar>
						<PageTitle title={title} />
					</Group>
					<Markdown content={description} />
				</Stack>
				{children}
			</Stack>
		</Container>
	);
}
