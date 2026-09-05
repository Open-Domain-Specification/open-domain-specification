# Flow Map

The `ODSFlowMap` class walks from the policies in scope to the event
consumables they react to, the operation consumables they issue, the events
those operations raise, and the policies those events wake in turn. Where a
consumption names one of those operations in `by`, the walk carries on into
the operation it calls, so a chain that crosses a bounded context is drawn
whole. The `flowMapToDigraph` function draws it left to right: events as
ellipses, policies as notes, operations as boxes.

![flow-map-example.svg](../../static/img/flow-map-example.svg)

```ts file=../../tests/flow-map.example.test.ts
```
