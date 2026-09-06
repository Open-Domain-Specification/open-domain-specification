# Viewer

The ODS viewer at [open-ds.io](https://open-ds.io) opens a workspace file and lets you browse
it with the same pages the VS Code extension shows. Load a file by URL, with a `?url=` query
parameter or the form, upload one from disk, or pick one of the reference models offered as
example cards. Nothing is sent anywhere: the file is read in
your browser, validated with the core package, and rendered client-side.

Every element has a page, addressed by its ref in the URL hash, so links into a workspace can
be shared: `#/boundedcontexts/sales_bc/aggregates/order` opens the Order aggregate.

The viewer, the static site export and the extension's detail panel are one Svelte app from
the pages package; `apps/ods-ui` is the deployable copy that open-ds.io publishes. See the
[Pages](8-pages.md) section for the component library and the export.

There are four ways to read a model and all four are permanent: this viewer, the extension's
detail panel, the static site export, and the [markdown](5-doc.md) the doc package generates.
The React and Mantine application that once served this site was retired when the site moved to
the shared renderer; the site itself stays.
