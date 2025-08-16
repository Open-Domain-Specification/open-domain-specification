# Using the Visitor

The visitor is a powerful feature for traversing and analyzing the domain model. It enables you to implement custom visitors to gather statistics, validate models, generate reports, visualize dependencies, or perform other complex operations on your domain model.

## Visitor Interface

At the core of the visitor pattern is the `Visitor` interface, which defines methods for visiting each type of node in the domain model.

```typescript
interface Visitor {
  visitWorkspace(node: Workspace): void;
  visitDomain(node: Domain): void;
  ...
}
```

## AbstractVisitor Class

The `AbstractVisitor` class provides a base implementation of the `Visitor` interface. It handles the traversal logic and cycle detection, so you only need to override the methods for the nodes you want to customize behavior for.

```typescript
class CustomVisitor extends AbstractVisitor {
  visitDomain(node: Domain) {
    // Custom behavior before traversing children
    console.log(`Visiting domain: ${node.name}`);
    
    // Call super to continue traversal to children
    super.visitDomain(node);
    
    // Custom behavior after traversing children
    console.log(`Finished visiting domain: ${node.name}`);
  }
}
```

### Traversal Options

The `AbstractVisitor` constructor accepts an options object to control the traversal behavior:

- `followConsumptions`: When `true`, the visitor will traverse from a service or aggregate to the consumables it consumes, even if they are in a different domain. This is useful for analyzing dependencies between bounded contexts.

- `followRelations`: When `true`, the visitor will traverse from an entity or value object to the other entities or value objects it is related to. This is useful for analyzing relationships within an aggregate.

By default, both options are `false`, meaning the visitor will only traverse the direct children of the node it is visiting.

```typescript
const visitor = new CustomVisitor({
  followConsumptions: true,  // Cross boundaries for service dependencies
  followRelations: true      // Follow entity relationships
});
```

### Hook Methods

The `AbstractVisitor` provides two hook methods that are called before and after visiting each node:

- `before(node: Visitable)`: Called before visiting a node's children.
- `after(node: Visitable)`: Called after visiting a node's children.

These hooks can be used for logging, setting up state, or performing other actions at different points in the traversal:

```typescript
class LoggingVisitor extends AbstractVisitor {
  protected before(node: Visitable) {
    console.log(`Starting visit of ${node.constructor.name}: ${node.name}`);
  }
  
  protected after(node: Visitable) {
    console.log(`Completed visit of ${node.constructor.name}: ${node.name}`);
  }
}
```

### Cycle Detection

The visitor has built-in cycle detection to prevent infinite loops when traversing models with circular dependencies. It keeps track of visited nodes using their `ref` property and will not visit the same node twice.

This is especially important when `followConsumptions` or `followRelations` is enabled, as it's common for services to have circular dependencies or for entities to have bidirectional relationships.

## Common Use Cases and Example

- **Domain Analysis**: Count and collect statistics about the components in a domain model."
- **Model Validation**: Validate that the domain model follows certain rules or conventions.
- **Dependency Analysis**: Analyze service dependencies across bounded contexts.
- **Documentation Generation**: Generate documentation from the domain model.

Here is a simple example demonstrating how to use the visitor pattern:

```ts file=../../tests/core-visitor.example.test.ts
```
