---
column: doing
labels: [frontend]
priority: medium
updatedAt: 2026-09-02T15:00:00.000Z
live: false
---
# Reload the in-memory workspace on external edits

An LLM or the user can edit any file in .ods directly. Watch the file and reload with fromSchema when the change did not originate from the extension, keeping the in-memory instance as the mutation path but the file as the meeting point.

## Checklist

- [x] File watcher with a write guard so the extension's own dumps do not trigger a reload
- [x] Debounced reload, tree view and diagnostics refresh
- [x] Failed reload keeps the previous instance and reports the failure as a diagnostic
- [ ] Conflict handling when the file changes while an unsaved mutation is pending

## Comments

- **claude** (2026-09-02T15:00:00.000Z): Done inside OdsProject: watcher on **/*.json filtered to the .ods folder, sha1 of own writes skips self-triggered reloads, 150ms debounce, a file that fails to load keeps its last good instance. Conflict handling with pending mutations waits until there are mutations.
