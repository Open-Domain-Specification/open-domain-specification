---
column: todo
labels: [models]
priority: medium
agent: developer
updatedAt: 2026-09-10T15:40:00.000Z
---
# A fifth model written blind in an unfamiliar domain

The architect's tenth round named a systemic risk: the validator's exemptions were shaped by what the four reference models needed (eight helpers under `reaction-cycle` alone), and nothing shows they generalise. The cheapest test is a fifth model in a domain unlike the four, written by someone who has not read them, counting the rules that must be worked around or amended to validate clean. The domain is an outpatient clinic: GP referrals arriving from an external practice system, triage, scheduling with slots and cancellations, a laboratory as an external context that answers with results, a records context that holds the patient's identity, a regulator that is a published language. Runs after card 116.

## Checklist

- [ ] `models/clinic` built like the others (DSL workspace, `DISCOVERY.md` interview, tests, `.ods` output, registered wherever the four are), written without reading `models/petstore`, `models/rivermart`, `models/streamline` or `models/northbank`; the skill in `packages/skill` and the docs are the only guide
- [ ] Every diagnostic met on the way is journalled in the card's Comments as either a modelling mistake fixed, a rule worked around and how, or a rule the author believes wrong, with the shape that triggered it
- [ ] The finished model validates clean or on purpose, with each on-purpose diagnostic explained in `DISCOVERY.md`
- [ ] `bash scripts/verify-all.sh` green, including the new model in the gate's list

## Comments
