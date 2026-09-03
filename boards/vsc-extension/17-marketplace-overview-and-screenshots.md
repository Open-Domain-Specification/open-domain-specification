---
column: todo
labels: [docs, frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-03T17:55:00.000Z
---
# Marketplace overview and extension screenshots

The extension's README (apps/ods-vscode/README.md) is the Marketplace listing, and today it reads as an engineering note: it explains the authoring model before it says what the extension is for, and it carries no images. Rewrite the top of it as a marketing overview and add real screenshots of the extension, captured by the automated VS Code suite so they can be regenerated on every release rather than taken by hand.

## Checklist

- [ ] Screenshot capture in the real-VS-Code suite (apps/ods-vscode/src/test/extension.test.ts), enabled by `ODS_SCREENSHOTS=1`, writing PNGs to apps/ods-vscode/media/screenshots/
- [ ] Four shots at a fixed window size: the Workspaces tree with a page open, a bounded context page with its context map in dark mode, the search spotlight, and the export site in the browser (or the aggregate page if the browser shot is impractical)
- [ ] `npm run screenshots -w ods-vscode` script that runs the suite with the flag; documented in the README Development section
- [ ] Marketing copy drafted by Antigravity (`agy --model gemini-3.8-flash-high --print="..."`), brief and prompt journalled on the card
- [ ] README rewritten: one-paragraph pitch, screenshots with captions, then a short feature list; the authoring-model and development sections move below
- [ ] Image links absolute to `raw.githubusercontent.com/Open-Domain-Specification/open-domain-specification/main/apps/ods-vscode/media/screenshots/...` so they render on the Marketplace
- [ ] `npm run test:vscode` still green without the flag; `npm run package -w ods-vscode` includes the screenshots

## Comments

- **lead** (2026-09-03T17:45:00.000Z): Assigned to dev-opus. Fixed by decision: screenshots are produced by the existing Mocha-in-Extension-Host suite (config in apps/ods-vscode/.vscode-test.mjs, petstore opened as the workspace), never by hand; QA here is watching the suite run headed. Capture on macOS with `screencapture -x` from `node:child_process`, cropping to the VS Code window bounds (find them via `osascript` or the `-l` window id; either is fine); skip capture with a logged message on other platforms. Force the "Default Dark Modern" theme through the launch user data dir settings for the dark shot and "Default Light Modern" for the others, or toggle via `workbench.colorTheme` in the test, whichever is reliable. Wait for the webview's ready message (the suite already verifies pages by posted messages) before capturing. Window size 1440x900. The pitch paragraph must say: DDD workspace in JSON in a `.ods` folder, live pages and diagrams, search, validation in Problems, AI skill install, static export. Do not change any extension behaviour or package.json contributions. Tests that prove it: `npm run test:vscode` green with and without `ODS_SCREENSHOTS=1`, and the four PNGs present after the flagged run. Work in your worktree; `npm ci` there first if node_modules is missing. If the card file is missing in your worktree, run `git reset --hard develop` there first.
- **lead** (2026-09-03T17:55:00.000Z): DECISION from the human on the copy. The marketing copy must be generated with the Antigravity CLI, `agy --model gemini-3.8-flash-high --print="<brief>"`, not written by you. Brief to give it: audience is technical (developers and architects); clean, clear, concise, no hyperbole; centre the value proposition of the domain model itself and the consistent experience across the three surfaces, the VS Code extension, the published pages, and the LLM skill that helps you learn and model the DDD way, positioned as a DDD copilot. Ask it for the pitch paragraph, the four screenshot captions and the feature list; run it twice if the first draft is padded and keep the tighter one. Paste the prompt you used and the chosen output into this journal, then place it in the README. You may trim adjectives; you may not add claims the extension does not deliver today.
