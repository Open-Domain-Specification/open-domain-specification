import {
	VscLayers,
	VscOrganization,
	VscShield,
	VscSymbolClass,
	VscSymbolEvent,
	VscSymbolMethod,
	VscSymbolNamespace,
	VscSymbolVariable,
} from "react-icons/vsc";

export const Icons = {
	Domain: <VscOrganization />,
	Subdomain: <VscLayers />,
	BoundedContext: <VscSymbolVariable />,
	Aggregate: <VscSymbolClass />,
	Entity: <VscSymbolMethod />,
	ValueObject: <VscSymbolNamespace />,
	Events: <VscSymbolEvent />,
	Operations: <VscSymbolMethod />,
	Invariants: <VscShield />,
};
