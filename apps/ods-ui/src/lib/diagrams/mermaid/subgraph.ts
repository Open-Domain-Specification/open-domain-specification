export function subgraph(row: string, namespace: string[]): string {
	for (const [i, ns] of namespace.reverse().entries()) {
		const indent = "\t".repeat(Math.max(namespace.length - i, 0));
		row = `${indent}subgraph ${ns} [${ns}]\n${row}\n${indent}end`;
	}

	return row;
}
