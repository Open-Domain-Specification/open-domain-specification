import { writeFileSync } from "node:fs";
import "./big-bank/index.ts";
import { bigBankWorkspace } from "./big-bank/workspace.ts";

writeFileSync(
	"big-bank-workspace.json",
	JSON.stringify(bigBankWorkspace, null, 2),
	"utf-8",
);
