# ods-ui

The ODS viewer published at [open-ds.io](https://open-ds.io). Open a workspace file by URL or
upload and browse it with the same pages the VS Code extension shows.

The viewer is the pages package's Vite app; `npm run build` copies it into `dist/`, which the
host publishes. See `apps/docs/docs/6-viewer.md`.

The reference models ship beside it as examples. A model is one workspace file or a set of them
(NorthBank is twelve, one per team); the build copies every workspace file of a model, in code-point
order of its name, and an example that is a set names each file as an entry, because no one file
refers to all the others. A reader at the viewer can also give several `url=` addresses and a
`root=`, or pick several files or a folder from their computer.
