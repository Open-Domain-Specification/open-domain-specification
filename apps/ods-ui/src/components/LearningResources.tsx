import { Anchor, Card, Grid, Image, Stack, Text } from "@mantine/core";

export function LearningResources() {
	return (
		<Stack gap={"xs"}>
			<Text fz={"xl"} fw={"bold"}>
				Learning Resources
			</Text>

			<Grid>
				<Grid.Col span={4} p={"md"}>
					<Card>
						<Card.Section>
							<Image src={"/1.png"} alt="logo" />
						</Card.Section>
						<Stack p={"md"}>
							<Text fw={"bold"} lineClamp={1}>
								Domain-Driven Design: Tackling Complexity in the Heart of
								Software
							</Text>
							<Text size={"sm"} lineClamp={3}>
								Eric Evans has written a fantastic book on how you can make the
								design of your software match your mental model of the problem
								domain you are addressing.
							</Text>
							<Anchor
								href={
									"https://learning.oreilly.com/library/view/domain-driven-design-tackling/0321125215/"
								}
								target={"_blank"}
							>
								Read Now
							</Anchor>
						</Stack>
					</Card>
				</Grid.Col>
				<Grid.Col span={4} p={"md"}>
					<Card>
						<Card.Section>
							<Image src={"/2.png"} alt="logo" />
						</Card.Section>
						<Stack p={"md"}>
							<Text fw={"bold"} lineClamp={1}>
								Implementing Domain-Driven Design
							</Text>
							<Text size={"sm"} lineClamp={3}>
								For software developers of all experience levels looking to
								improve their results, and design and implement domain-driven
								enterprise applications consistently with the best current state
								of professional practice, Implementing Domain-Driven Design will
								impart a treasure trove of knowledge hard won within the DDD and
								enterprise application architecture communities over the last
								couple decades.
							</Text>
							<Anchor
								href={
									"https://learning.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/"
								}
								target={"_blank"}
							>
								Read Now
							</Anchor>
						</Stack>
					</Card>
				</Grid.Col>
				<Grid.Col span={4} p={"md"}>
					<Card>
						<Card.Section>
							<Image src={"/3.png"} alt="logo" />
						</Card.Section>
						<Stack p={"md"}>
							<Text fw={"bold"} lineClamp={1}>
								Design a DDD-oriented microservice
							</Text>
							<Text size={"sm"} lineClamp={3}>
								Domain-driven design (DDD) advocates modeling based on the
								reality of business as relevant to your use cases. In the
								context of building applications, DDD talks about problems as
								domains. It describes independent problem areas as Bounded
								Contexts (each Bounded Context correlates to a microservice),
								and emphasizes a common language to talk about these problems.
								It also suggests many technical concepts and patterns, like
								domain entities with rich models (no anemic-domain model), value
								objects, aggregates, and aggregate root (or root entity) rules
								to support the internal implementation. This section introduces
								the design and implementation of those internal patterns.
							</Text>
							<Anchor
								href={
									"https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice"
								}
								target={"_blank"}
							>
								Read Now
							</Anchor>
						</Stack>
					</Card>
				</Grid.Col>
			</Grid>
		</Stack>
	);
}
