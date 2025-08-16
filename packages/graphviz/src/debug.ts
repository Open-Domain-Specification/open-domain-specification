import { debug as _debug, type Debugger } from "debug";

export const debug = _debug("open-domain-specification:graphviz");

export function getDebug(namespace: string): Debugger {
	return debug.extend(namespace);
}
