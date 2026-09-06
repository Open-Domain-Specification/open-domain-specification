# Flow Map

The `ODSFlowMap` class walks from the policies and processes in scope to the
event consumables they react to, the operation consumables they issue, the
events those operations raise, and the policies and processes those events
wake in turn. Where a consumption names one of those operations in `by`, the
walk carries on into the operation it calls, so a chain that crosses a
bounded context is drawn whole. The `flowMapToDigraph` function draws it left
to right: events as ellipses, policies as notes, processes as folders,
operations as boxes.

An answer is drawn as one more edge from the operation that answers,
labelled with the shape it came back as: a returned or rejected schema is
the call coming back rather than something that happens on the way
somewhere, so it gets no box of its own.

A process is drawn with its lifecycle: what starts an instance comes in on
the left with everything else it waits for, and what ends one leaves it on a
dashed `ends` edge. That edge is drawn and never walked, because an ending
fact completes an instance rather than waking it again — which is why a
process that ends on an event its own operations raise is no cycle.

![flow-map-example.svg](../../static/img/flow-map-example.svg)

```ts file=../../tests/flow-map.example.test.ts
```
