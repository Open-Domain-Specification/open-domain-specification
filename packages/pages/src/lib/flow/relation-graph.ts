import type { ODSRelationMap } from "@open-domain-specification/core";
import { ICONS } from "../icons";
import { type Graph, groupOf } from "./graph";

export function relationGraph(map: ODSRelationMap): Graph {
	return {
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			label: n.name,
			icon: n.type === "valueobject" ? ICONS.valueobject : ICONS.entity,
			group: groupOf(n.namespace),
			chips:
				n.type === "entity_root"
					? ["root"]
					: n.type === "valueobject"
						? ["value object"]
						: [],
			attributes: n.attributes.map((a) => ({
				name: a.name,
				type: a.type,
				identity: a.identity,
			})),
			tone:
				n.type === "entity_root"
					? "core"
					: n.type === "valueobject"
						? "muted"
						: "",
		})),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			source: e.source.id,
			target: e.target.id,
			label: e.label,
			directed: true,
			dashed: e.relation === "references",
			targetLabel: e.cardinality,
		})),
	};
}
