---
column: todo
labels: [backend, docs]
priority: high
updatedAt: 2026-09-02T14:00:00.000Z
live: false
---
# Rich JSON schema for workspace.json

The core build generates dist/workspace.schema.json from packages/core/src/schema.ts with typescript-json-schema. Only 15 of 113 properties carry a description and most type descriptions are placeholders. An LLM writing workspace.json learns the shape but not the meaning. The extension will write schema.json beside workspace.json, so the schema has to carry the contract.

## Checklist

- [ ] JSDoc description on every property and type in schema.ts, written for a reader who has not seen the docs site
- [ ] Each type's description includes usage guidance: when to create one, what it must reference, and common mistakes, so an LLM can author the file from the schema alone
- [ ] Examples on ref fields and enum properties via the examples tag
- [ ] Ref-shaped fields document their exact path shape and carry a pattern
- [ ] Enum properties explain the meaning of every value
- [ ] Record keys constrained with propertyNames using the card 15 id rules
- [ ] Optional $schema property on the workspace, ignored by fromSchema
- [ ] Root description states what the file is, the id and ref rules, and the structural rules validate enforces
- [ ] Test asserting every property in the generated schema has a description
- [ ] Publish the schema at a stable URL on the docs site
