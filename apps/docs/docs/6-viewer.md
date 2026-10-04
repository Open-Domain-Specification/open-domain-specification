# Viewer

The ODS viewer at [open-ds.io](https://open-ds.io) opens a workspace, or a set of workspace files,
and lets you browse it with the same pages the VS Code extension shows. Nothing is sent anywhere
except the requests for the files you name: the files are read in your browser, validated with
the core package, and rendered client-side. The inputs are:

- **One file by URL**, with a `?url=` query parameter or the form, **by upload**, or one of the
  reference models offered as example cards. A file opened alone is a workspace alone: a ref it
  writes into another file reports `unresolved-ref`, because there is no set to look in.
- **Several files by URL.** `?url=` may be repeated, and an optional `?root=` names the folder they
  are all under. The viewer reads each file and follows the file-qualified refs it finds, breadth
  first, with a visited set keyed by the canonical path so a cycle of files is fetched once each.
  `..` is followed only while it stays under the root, which defaults to the longest common folder
  of the URLs. A file that cannot be fetched (404, blocked by CORS, not JSON, larger than 2 MiB, a
  path that leaves the root, or one past the limit of 64 files) is left out with its own message,
  and every ref into it is reported unresolved. At most 4 requests are in flight at once.
- **Several files or a folder by upload.** The form takes several files, or a folder; the
  folder's own name is not part of a path, names with spaces, `#`, `%` or Unicode are kept as they
  are, and a `schema.json` beside them is skipped with a notice. A folder or a selection you made
  is the whole set by construction.

A set read from addresses is **never presented as the whole project**. A static host exposes no
listing and the model has no root document, so from one entry the viewer sees only the files that
entry's refs reach: a file nothing reachable refers to (a team file nobody else names, or a
reverse dependent) is not found, and the viewer says so. Pass more `url=` entries, or upload the
folder, to see the rest.

With one workspace the address is what it always was: `#/boundedcontexts/sales_bc/aggregates/order`
opens the Order aggregate, and a leaf ref such as an attribute, answer, deadline or consumption
opens its nearest owner's page (attribute refs also select their table row). With two or more,
local ids can repeat, so the file comes first:
`#/workspaces/<file>/boundedcontexts/ledger`, where `<file>` is the wire path of the file as one
pointer segment (`a#%.json` is `a%2523%2525.json` in the address bar once the browser encodes the
`%`). A route that names no file shows the page that lists the workspaces; there is no search
across files and no fallback, so a link always reaches the element of the file it names. The
transport encoding preserves the model ref exactly.

The viewer, the static site export and the extension's detail panel are one Svelte app from
the pages package; `apps/ods-ui` is the deployable copy that open-ds.io publishes. See the
[Pages](8-pages.md) section for the component library and the export.

There are four ways to read a model and all four are permanent: this viewer, the extension's
detail panel, the static site export, and the [markdown](5-doc/index.md) the doc package generates.
The React and Mantine application that once served this site was retired when the site moved to
the shared renderer; the site itself stays.
