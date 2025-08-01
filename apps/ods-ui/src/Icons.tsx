import {
	VscLayers,
	VscOrganization,
	VscSymbolClass,
	VscSymbolMethod,
	VscSymbolNamespace,
	VscSymbolVariable,
} from "react-icons/vsc";

export const Symbols = {
	Domain: <VscOrganization />,
	Subdomain: <VscLayers />,
	BoundedContext: <VscSymbolVariable />,
	Aggregate: <VscSymbolClass />,
	Entity: <VscSymbolMethod />,
	ValueObject: <VscSymbolNamespace />,
};
