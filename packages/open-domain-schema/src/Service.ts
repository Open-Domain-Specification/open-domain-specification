import type { ServiceType } from "./ServiceType";

export type Service = {
	id: string;
	type: ServiceType;
	name: string;
	description: string;
	operations?: {
		id: string;
		name: string;
		description?: string;
	}[];
	events?: {
		id: string;
		name: string;
		description?: string;
	}[];
};
