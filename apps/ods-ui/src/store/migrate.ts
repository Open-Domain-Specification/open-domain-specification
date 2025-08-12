import hash from "object-hash";
import type { Database } from "sql.js";
import { DEBUG } from "../debug.ts";
import MIGRATE_DDL from "./migrate.ddl.sql?raw";
import MIGRATE_DML from "./migrate.dml.sql?raw";
import MIGRATE_DQL from "./migrate.dql.sql?raw";

const MIGRATIONS: Record<string, string> = import.meta.glob(
	"../../drizzle/*.sql",
	{
		query: "?raw",
		import: "default",
		eager: true,
	},
);

export function migrateWorkspace(db: Database) {
	DEBUG(`Creating Drizzle Migrations table if not exists`);

	const res = db.exec(MIGRATE_DDL);

	if (res[0].values.length) {
		DEBUG(`Drizzle Migrations table created successfully`);
	} else {
		DEBUG(`Drizzle Migrations table creation failed`);
		throw new Error(
			`Drizzle Migrations table creation failed. Please check the migration DDL.`,
		);
	}

	for (let [path, migration] of Object.entries(MIGRATIONS)) {
		path = path.split("/").at(-1) ?? path;
		const _migrationHash = hash({ path, migration });

		DEBUG(`Checking migration from ${path} with hash ${_migrationHash}`);
		const existing = db.exec(MIGRATE_DQL, [path, _migrationHash]);

		if (existing[0]?.values.length) {
			DEBUG(`Migration ${path} already applied, skipping.`);
			continue;
		}

		DEBUG(`Applying migration from ${path}`);
		db.exec(migration);

		DEBUG(`Migration ${path} applied, updating migration log`);
		const applied = db.exec(MIGRATE_DML, [path, _migrationHash]);

		DEBUG(`Checking if migration ${path} was applied successfully`);

		DEBUG(applied);

		if (!applied[0]?.values.length) {
			DEBUG(`Migration ${path} failed to apply`);
			throw new Error(`Migration ${path} failed to apply`);
		}

		DEBUG(`Migration ${path} applied successfully`);
	}
}
