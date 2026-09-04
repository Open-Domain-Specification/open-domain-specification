# LanguageSection

`packages/pages/src/lib/organisms/LanguageSection.svelte`. Verdict: restyle.

## Primitives

`Section`, `Ref` (comma-separated, the restyled `RefList`), `EmptyState`.

## Layout

```
In the ubiquitous language                              (Heading 2)
Glossary terms this element embodies ...                 (lead)

  📖 Available, 📖 Pet
```

One line of comma-separated term `Ref`s with the term icon, at row height.
The pills go: a term is a link, and a link looks like a link.

Empty: `EmptyState "No glossary term names this element."`.
