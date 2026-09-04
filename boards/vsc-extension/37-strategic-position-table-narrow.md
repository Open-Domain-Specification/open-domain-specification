---
column: backlog
labels: [frontend]
priority: med
agent: designer-fable
updatedAt: 2026-09-05T05:40:00.000Z
---
# Strategic position table at narrow widths

With the site tree beside it at a 1280px window, the Strategic position table has about 740px for six no-wrap columns, so Description shrinks to a word per line even with `grow`. In the webview (no tree) it fits. Designer to rule: which columns may wrap or stack below a width (type, roles), whether the table drops to a two-line row layout, or whether the tree collapses first. Apply in `v2/organisms/StrategicPositionTable.svelte` and `v2/DataTable.svelte` if a general rule falls out; e2e assertion at 1280px with the tree.
