import {
	VscDebugStepInto,
	VscDebugStepOut,
	VscLayers,
	VscOrganization,
	VscPlay,
	VscShield,
	VscSymbolClass,
	VscSymbolEvent,
	VscSymbolMethod,
	VscSymbolNamespace,
	VscSymbolVariable,
	VscTypeHierarchy,
} from "react-icons/vsc";

export const Icons = {
	Domain: <VscOrganization />,
	Subdomain: <VscLayers />,
	BoundedContext: <VscSymbolVariable />,
	Aggregate: <VscSymbolClass />,
	Entity: <VscSymbolMethod />,
	ValueObject: <VscSymbolNamespace />,
	Events: <VscSymbolEvent />,
	Operations: <VscPlay />,
	Invariants: <VscShield />,
	Service: <VscTypeHierarchy />,
	Provider: <VscDebugStepInto />,
	Consumer: <VscDebugStepOut />,
};
