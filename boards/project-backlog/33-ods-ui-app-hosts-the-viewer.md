---
column: done
labels: [infra, frontend]
priority: high
agent: claude
live: false
status: Done; apps/ods-ui restored as a thin app copying the viewer bundle to dist
progress: 100
updatedAt: 2026-09-03T00:45:00.000Z
---
# The open-ds.io deploy lost its app: restore apps/ods-ui as the viewer host

boards/project-backlog/24-browser-viewer-replaces-ods-ui.md deleted `apps/ods-ui` when the Svelte viewer in the pages package replaced the React app, but the Cloudflare Pages project that serves open-ds.io still publishes `apps/ods-ui/dist`, so every deploy since fails with "Output directory apps/ods-ui/dist not found". Pointing the host at `packages/pages/app` would be the wrong direction: a public deployable is an app and belongs under `apps/`, and a host should not reach into a library package's build folder. Follows decisions/12-one-renderer-three-hosts.md.

## Checklist

- [x] `apps/ods-ui` is a thin app: its build copies the pages viewer bundle into `dist/`, the way `apps/ods-vscode` copies it into `media/app`
- [x] It depends on the pages package so lerna builds pages first
- [x] Root build produces `apps/ods-ui/dist` with the import screen; Cloudflare config unchanged
- [x] Docs and README point at the app

## Comments

- **claude** (2026-09-03T00:45:00.000Z): Raised from the failing open-ds.io deploy on PR #19. apps/ods-ui/package.json declares the pages dependency and apps/ods-ui/scripts/build.mjs resolves the package and copies its `app/` folder to `dist/`, clearing it first so hashed chunks from earlier builds cannot linger. Verified: root build emits apps/ods-ui/dist/index.html with the viewer import screen (URL form and file upload).
