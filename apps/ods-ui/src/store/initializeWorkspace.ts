import initSqlJs, { type Database } from "sql.js";
import wasm from "sql.js/dist/sql-wasm.wasm?url";
import { DEBUG } from "../debug.ts";
import { migrateWorkspace } from "./migrate.ts";

export async function initializeWorkspace(
	data?: Uint8Array,
): Promise<Database> {
	DEBUG(`Initializing SQL.js with wasm file: ${wasm}`);
	const sqljs = await initSqlJs({ locateFile: () => wasm });
	const db = new sqljs.Database(data);

	const originalExec = db.exec.bind(db);
	db.exec = (...args: Parameters<typeof originalExec>) => {
		DEBUG(`[SQL EXEC] ${args}`);
		return originalExec(...args);
	};

	const originalRun = db.run.bind(db);
	db.run = (...args: Parameters<typeof originalRun>) => {
		DEBUG(`[SQL RUN] ${args}`);
		return originalRun(...args);
	};

	const originalPrepare = db.prepare.bind(db);
	db.prepare = (...args: Parameters<typeof originalPrepare>) => {
		DEBUG(`[SQL PREPARE] ${args}`);
		return originalPrepare(...args);
	};

	DEBUG(`Applying migrations...`);
	migrateWorkspace(db);

	return db;
}
