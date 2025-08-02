export function snakeCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1_$2") // Insert underscore before uppercase letters
		.replace(/[\s-]+/g, "_") // Replace spaces and hyphens with underscores
		.toLowerCase(); // Convert to lowercase
}
