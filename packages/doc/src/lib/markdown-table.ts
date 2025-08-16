export function markdownTable(headers: string[], rows: string[][]): string {
	if (headers.length === 0 || rows.length === 0) {
		return "";
	}

	const headerRow = `| ${headers.join(" | ")} |\n`;
	const separatorRow = `| ${headers.map(() => "---").join(" | ")} |\n`;
	const dataRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

	return `${headerRow}${separatorRow}${dataRows}\n`;
}
