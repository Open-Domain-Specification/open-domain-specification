#!/usr/bin/env bash
# The lead's whole landing checklist, as one script: build the buildable
# packages, run every package's test suite inside its own directory (never
# via lerna/nx, which — in a nested worktree — resolve their cache to the
# main checkout, not this one), run the pages e2e fit spec, then compare the
# petstore schema fixture to the core dist. Stops on the first failure and
# prints one summary line per package.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SUMMARY_FILE="$(mktemp)"
trap 'rm -f "$SUMMARY_FILE"' EXIT

if pgrep -f extensionDevelopmentPath >/dev/null 2>&1; then
	echo "refusing to start: a VS Code extension development host is running (pgrep -f extensionDevelopmentPath found one)" >&2
	exit 1
fi
if lsof -i :4173 >/dev/null 2>&1; then
	echo "refusing to start: port 4173 is in use (another gate's pages e2e stage, or a preview server); wait for it or stop it" >&2
	exit 1
fi

summary() {
	echo "$1" | tee -a "$SUMMARY_FILE"
}

# Runs vitest inside a package directory and prints one summary line with the
# test count parsed from vitest's own "Tests  N passed (N)" line.
run_vitest() {
	local label="$1" dir="$2"
	shift 2
	local log
	log="$(mktemp)"
	(cd "$ROOT/$dir" && npx vitest run "$@") 2>&1 | tee "$log"
	local status=${PIPESTATUS[0]}
	if [ "$status" -ne 0 ]; then
		summary "$label: FAILED"
		rm -f "$log"
		exit "$status"
	fi
	local count
	count="$(grep -E '^ *Tests +' "$log" | tail -1 | sed -E 's/^ *Tests +([0-9]+) passed.*/\1/')"
	rm -f "$log"
	summary "$label: ${count:-0} tests passed"
}

run_build() {
	local label="$1" dir="$2"
	shift 2
	echo "==> building $label"
	(cd "$ROOT/$dir" && npm run build "$@")
}

# --- builds ---
run_build core packages/core
run_build graphviz packages/graphviz
run_build doc packages/doc

# --- package suites ---
run_vitest core packages/core
run_vitest graphviz packages/graphviz
run_vitest doc packages/doc

echo "==> generating skill bundle"
(cd "$ROOT/packages/skill" && npm run generate && npm run build)
run_vitest skill packages/skill

for model in northbank petstore rivermart streamline; do
	echo "==> building model $model"
	(cd "$ROOT/models/$model" && npm run build)
	if [ "$model" = petstore ]; then
		# The gate: the build just copied core's schema beside the fixture, so
		# they must be identical now. Compared here, not at the end, because an
		# extension dev server open on models/petstore rewrites the file from
		# its own bundled core whenever it rebuilds, and the window between
		# this line and the end of the run is minutes.
		if cmp -s "$ROOT/models/petstore/.ods/schema.json" "$ROOT/packages/core/dist/workspace.schema.json"; then
			summary "schema comparison (petstore vs core dist): match"
		else
			summary "schema comparison (petstore vs core dist): MISMATCH"
			exit 1
		fi
	fi
	run_vitest "$model" "models/$model"
done
run_vitest "models/_shared" models/_shared

echo "==> building pages"
(cd "$ROOT/packages/pages" && npm run build)

echo "==> verifying published ESM builds import under Node"
if node "$ROOT/scripts/verify-esm-builds.mjs"; then
	summary "esm builds (core, graphviz, doc, skill, pages): import ok"
else
	summary "esm builds (core, graphviz, doc, skill, pages): FAILED"
	exit 1
fi

run_vitest pages packages/pages --coverage
echo "==> checking pages (svelte-check)"
(cd "$ROOT/packages/pages" && npm run check)

run_vitest "apps/docs" apps/docs
run_vitest "apps/ods-vscode" apps/ods-vscode

# --- pages e2e fit spec ---
if ! npx --prefix "$ROOT/packages/pages" playwright --version >/dev/null 2>&1; then
	echo "playwright CLI missing in packages/pages; run: npm install (in packages/pages)" >&2
	exit 1
fi
BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}"
if [ ! -d "$BROWSERS_PATH" ] || [ -z "$(ls -A "$BROWSERS_PATH" 2>/dev/null)" ]; then
	echo "playwright browsers are not installed; run: npx playwright install --with-deps chromium (in packages/pages)" >&2
	exit 1
fi

e2e_log="$(mktemp)"
(cd "$ROOT/packages/pages" && npx playwright test) 2>&1 | tee "$e2e_log"
e2e_status=${PIPESTATUS[0]}
if [ "$e2e_status" -ne 0 ]; then
	if grep -qi "executable doesn't exist" "$e2e_log"; then
		echo "playwright browsers are not installed; run: npx playwright install --with-deps chromium (in packages/pages)" >&2
	fi
	rm -f "$e2e_log"
	summary "pages e2e (full suite): FAILED"
	exit "$e2e_status"
fi
rm -f "$e2e_log"
summary "pages e2e (full suite): passed"

# --- schema drift after the build ---
# Not a failure: the build wrote the right file and the gate above checked it.
# A difference here means another process rewrote it since (an extension dev
# server or test host open on models/petstore). Restore it and say so.
if ! cmp -s "$ROOT/models/petstore/.ods/schema.json" "$ROOT/packages/core/dist/workspace.schema.json"; then
	cp "$ROOT/packages/core/dist/workspace.schema.json" "$ROOT/models/petstore/.ods/schema.json"
	summary "schema drift: models/petstore/.ods/schema.json was rewritten during the run by another process and has been restored from core dist; check for an extension dev server (pgrep -f 'ods-vscode.*dev.mjs')"
fi

echo
echo "=== verify-all summary ==="
cat "$SUMMARY_FILE"
