import { section } from "../format";

/**
 * Domain knowledge from the canonical BNII project note.
 * This is reference material — knowledge, not voice.
 */
export const context = () =>
  section(
    "context",
    `## The position
BNII turns consented behavioural signal — captured at the point of action inside
telco, wallet, and bank apps across emerging markets — into sellable,
market-level intelligence.

The intelligence industry (consulting, market research, credit bureaus, panel
measurement) sees the top and middle of markets well and the bottom of emerging
markets barely at all. Prepaid users, first-time wallet holders, and
cash-adjacent consumers across markets like Indonesia, Bangladesh, Sri Lanka,
Ethiopia, Rwanda, and Nigeria are close to invisible to the people who sell
insight for a living. BNII sits inside the apps those consumers already use.

## Why now
The scarce asset is no longer the model. Frontier models are rentable and
swappable. The embedded position and the consented data it reasons from are not.
The window is open because the position is live and the models became commodity
at the same time.

Treat scale figures as provisional unless the user supplies current numbers.
Prefer "partner footprint" and "embedded position" framing over inventing live
metrics.

## Five commercial surfaces, one asset
All five sit behind the same consent gates, the same k-floor, and the same
audit-and-metering ledger. Governance does not weaken as depth increases —
governance is what makes depth sellable.

1. Credits — metered like any enterprise AI product. Buy a credit pool, draw it
   down by what each query actually fires. The audit log we emit for credibility
   is the billing ledger. Build audit and metering as one system.
2. Build on top — clients use BNII intelligence as substrate for their own
   models: a bank builds credit scoring on in-market signal, an FMCG builds
   demand sensing on category intelligence. BNII is an intelligence supplier,
   not only an answer engine.
3. Bring your own data — clients upload or connect their data and extract
   intelligence from the combination. Their data read against a market backdrop
   only BNII can see. This is the strongest differentiator versus a generic AI
   tool.
4. Data & intelligence APIs — clients who do not want briefs pull governed
   datasets, indices, and structured intelligence straight into their own
   pipelines. Same gates, enforced at the API boundary.
5. Run on our infra — the deepest surface. Clients run their own models against
   BNII datasets in place. The model comes to the data, raw signal never
   egresses, the client gets the intelligence output. Strongest governance
   posture and deepest lock-in at once.

## Build agenda (reach for these when relevant)
- Event pipeline and the methodology surface
- Dual-write schema boundary
- Licensed feeds and classification-quality evals
- Metering-and-credit layer (audit log = ledger)
- Persistent connected data
- Tenant-isolated execution environment (enables run-on-our-infra)

## Current platform reality
The live product is the ARIA workspace: authenticated chat, plans and usage
metering in the UI, and web-grounded answers. Partner data connectors, the event
pipeline, and the intelligence APIs are roadmap, not shipped. Never present
roadmap as live.`,
  );
