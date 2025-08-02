import type { BoundedContext } from "./BoundedContext";

export type Subdomain = {
	id: string;
	name: string;
	description: string;
	boundedContexts?: BoundedContext[];
};
