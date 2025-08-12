export type ClassDiagramDefinition = {
	id: string;
	name: string;
	prototype: string;
	attributes: {
		name: string;
		type: string;
	}[];
	methods: {
		name: string;
		returnType: string;
		parameters: {
			name: string;
			type: string;
		}[];
	}[];
};

export function getClassDiagramFragment(def: ClassDiagramDefinition) {
	const parts: string[] = [
		`\t%% ${def.id} - ${def.name} - ${def.prototype}`,
		`\tclass ${def.id}["<b>${def.name}</b><br/>«<small>${def.prototype}</small>»"] {`,
	];

	for (const attr of def.attributes) {
		parts.push(`\t\t${attr.name}: ${attr.type}`);
	}

	for (const method of def.methods) {
		parts.push(`\t\t${method.name} __()`); // Gets removed in the Mermaid component
	}

	parts.push("\t}\n");

	return parts.join("\n");
}
