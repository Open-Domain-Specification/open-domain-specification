


# TransactionScorer
The bank's own model; a domain service because it reads across every customer's history

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| ScoreTransaction | operation | no | open-host-service | Score synchronously; callers wait on the verdict | [ScoreTransaction](../../index.md#schemas) | TransactionFlagged, TransactionCleared |


## Consumes
> No consumptions.
	
