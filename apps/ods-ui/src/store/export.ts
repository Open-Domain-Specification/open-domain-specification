import jsFileDownload from "js-file-download";
import type { Database } from "sql.js";

export function exportWorkspace(db: Database) {
	jsFileDownload(db.export(), "workspace.sqlite");
}
