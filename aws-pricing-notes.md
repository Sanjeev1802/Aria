# AWS pricing verification

Checked 20 October 2026. USD before tax; US East (N. Virginia) source-region baseline. These are supplier costs, not proposed ARIA retail prices.

## Bedrock text inference

Standard on-demand prices per million input / output tokens:

- Amazon Nova Micro: $0.035 / $0.14.
- Amazon Nova Lite: $0.06 / $0.24.
- Amazon Nova Pro: $0.80 / $3.20.
- Amazon Nova 2 Lite: $0.33 / $2.75 for geographic cross-region/in-region pricing; $0.30 / $2.50 for global cross-region pricing.

Verified by resolving the pricing page's model row identifiers against AWS's live price data, published 16 October 2026. The page multiplies the JSON's per-thousand-token values by 1,000 for its per-million-token display. Sources: [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/), [AWS price data](https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/bedrock/USD/current/bedrock.json).

## Regional caveat

Geographic profiles can process requests in other regions inside their geographic boundary; global profiles can process worldwide. A us-east-1 API endpoint does not by itself promise processing only in us-east-1. Cross-region routing has no separate routing surcharge; billing depends on the source region. Confirm model/profile availability and customer residency requirements before deployment. [AWS cross-region inference documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html).

## Lambda

US baseline x86 on-demand compute: $0.0000166667 per GB-second; requests: $0.20 per million. Published monthly free allowance: 400,000 GB-seconds and one million requests, subject to account eligibility/shared consumption. Model streaming waiting time is execution time and must be budgeted. Example gross cost for 150,000 requests at 0.5 GB × 15 seconds: $18.75 compute + $0.03 requests, before free allowances and ancillary charges. [Lambda pricing](https://aws.amazon.com/lambda/pricing/).

## Cognito

Essentials and Lite offer 10,000 free monthly active users for direct/social sign-in per account or AWS organization. Thus 500 eligible users can have $0 base authentication cost. Essentials direct/social users above the allowance cost $0.015/MAU. SAML/OIDC federation has only 50 free MAUs; 500 federated users would cost $6.75/month. Machine-to-machine tokens have no free tier. Email/SMS and dependent services are additional. [Cognito pricing](https://aws.amazon.com/cognito/pricing/).

## Illustrative model arithmetic for 500 users

Assume one model call per request, 3,000 input tokens including history/retrieved context, 800 output tokens, 90% Nova Lite and 10% Nova Pro, no caching discounts.

Lite costs $0.000372/request; Pro costs $0.00496/request; weighted cost is $0.0008308/request.

- 50,000 total monthly requests: $41.54 model cost.
- 150,000 total monthly requests: $124.62 model cost.
- 500,000 total monthly requests: $415.40 model cost.

These are calculated scenarios, not fixed 500-user prices. Include both chat and API traffic. Retries, agent steps, indexing, retrieval, tools, guardrails, longer prompts, storage, hosting and support are extra; avoid unlimited API usage. Add a contingency budget and hard credit enforcement.
