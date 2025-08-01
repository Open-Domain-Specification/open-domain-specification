import type { CardinalityRange } from "./Aggregate";

export type Entity = {
	id: string;
	name: string;
	description?: string;
	relationships?: Record<
		string,
		{ left: CardinalityRange; right: CardinalityRange; label?: string }
	>;
};
