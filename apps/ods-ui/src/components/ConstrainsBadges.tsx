import { Badge, Group, Text } from "@mantine/core";
import {
	type Constrainable,
	constrainableLabel,
} from "@open-domain-specification/core";

/** The elements an invariant constrains, as badges. */
export function ConstrainsBadges(props: { targets: Constrainable[] }) {
	if (props.targets.length === 0) return null;

	return (
		<Group gap={"xs"}>
			<Text size={"xs"} c={"dimmed"}>
				Constrains
			</Text>
			{props.targets.map((target) => (
				<Badge key={target.ref} size={"sm"} variant={"outline"}>
					{constrainableLabel(target)}
				</Badge>
			))}
		</Group>
	);
}
