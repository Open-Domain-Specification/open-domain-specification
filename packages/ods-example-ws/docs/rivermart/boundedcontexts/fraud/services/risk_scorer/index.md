


# RiskScorer
Runs the model over an order or seller and its history; a domain service because it reads across assessments

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| ScoreOrder | operation | yes | - | Assess a newly placed order | - | OrderRiskFlagged |
| ScoreSeller | operation | yes | - | Assess a newly activated seller | - | SellerRiskFlagged |


## Consumes
> No consumptions.
	
