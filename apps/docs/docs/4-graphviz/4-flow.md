# Flow Map

The `ODSFlowMap` class walks from the policies in scope to the events they
react to, the commands they issue and the events those commands raise. The
`flowMapToDigraph` function draws it left to right: events as ellipses,
policies as notes, commands as boxes.

![flow-map-example.svg](../../static/img/flow-map-example.svg)

```ts file=../../tests/flow-map.example.test.ts
```
