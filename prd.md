# ARIA Chat — Simple Product Requirements

**Status:** Proposed MVP  
**Date:** 20 October 2026

## What we are building

ARIA Chat is a web application where business users can ask questions in plain language and receive useful answers from ARIA's intelligence layer.

It combines the familiar experience of ChatGPT or Claude with ARIA's main advantage: answers grounded in permitted business data, documents, and evidence.

**Simple promise:** Ask a question, understand the evidence, decide what to do next.

The Binary Labs positions ARIA as a model-agnostic intelligence layer between foundation models and partner applications. This chat application is a proposed new interface to that layer, not an existing ARIA product. [Source](https://thebinarylabs.ai/)

## Who it is for

The first version is for invited business and partner users:

- Growth and operations teams investigating changes in customers, markets, or metrics.
- Strategy and research teams comparing markets or preparing recommendations.
- Workspace administrators managing users, access, and usage.

This is a starting assumption. A public consumer app would need a different product plan.

## The problem

People can ask business questions easily, but answering them usually requires finding data, writing queries, reading reports, and checking sources.

Generic AI can write a convincing answer without having the right company data or showing how it reached a conclusion. ARIA Chat should connect a natural-language question to authorized evidence and a practical next step.

## The first user experience

1. A user signs in to an organization workspace.
2. The user starts a conversation or uploads a document.
3. The user asks a question in plain language.
4. ARIA streams an answer.
5. The answer shows sources, time period, data scope, and limitations.
6. The user asks follow-up questions.
7. The user saves the useful result as an editable decision brief.

The interface should feel calm and familiar: conversation history on the left, chat in the center, and sources or files beside the answer.

## MVP features

### Accounts and workspaces

- Invited sign-in.
- Organization workspaces.
- Admin and Member roles.
- Server-side permission checks for every chat, file, source, and export.

### Chat

- Create, rename, search, and delete conversations.
- Persistent conversation history.
- Streaming responses.
- Stop, retry, and copy actions.
- Clear error and unavailable-service states.

### Two answer modes

- **General:** writing, explanation, and analysis using the conversation and uploaded files.
- **ARIA Intelligence:** questions answered using approved ARIA data and services.

The active mode and data scope must always be visible. If ARIA data is unavailable, the product must say so rather than pretending that a generic answer is ARIA-backed.

### Document analysis

The MVP should accept text-based PDF, TXT, and CSV files. Users should see upload, processing, ready, and failure states. Answers should point to relevant pages, sections, rows, or columns when possible.

### Evidence-backed answers

For business answers, show:

- What data was used.
- Which market, segment, and time period were included.
- Source references and freshness.
- What was observed versus calculated.
- Any important limitation.

If the question is ambiguous or evidence is missing, ARIA should ask a clarifying question or explain the limitation.

### Decision briefs

Users can turn a conversation into an editable brief containing the original question, data scope, main findings, sources, limitations, and recommended next steps. The brief can be exported as Markdown and keeps a link to the source conversation.

### Feedback and administration

- Thumbs-up or thumbs-down feedback with an optional reason.
- Admin invitation and membership management.
- Usage and quota visibility.
- Audit records for access and membership changes.
- User deletion of conversations and uploaded files.

## What is not in the first version

- Public consumer launch.
- Native mobile apps, voice, or image generation.
- Autonomous transactions or campaign execution.
- Unrestricted web browsing or arbitrary third-party connectors.
- Public conversation links.
- Open agent marketplace.
- Payments and subscription plans.

These can be considered after the pilot proves that users repeatedly complete useful ARIA-backed work.

## How it should work

```
Web app
  → Authenticated application API
  → Permission and policy checks
  → ARIA service, approved model, or document retrieval
  → Streaming answer with sources
```

The server must control authentication, permissions, data retrieval, model calls, quotas, conversation storage, and citations. Provider-specific code should sit behind adapters so models can be changed without rewriting the product.

Before building the live integration, confirm the actual ARIA contract: authentication, tenant mapping, available operations, response format, data restrictions, residency, rate limits, costs, and error behavior. The examples on the public website are illustrative and do not establish a production API contract.

## Trust and privacy basics

- Users can only access data permitted for their organization and role.
- API keys stay on the server.
- Files and conversations are encrypted in transit and at rest.
- Uploads and retrieved text cannot override system rules or authorize actions.
- Restricted or small-group results must be suppressed according to the upstream data policy.
- The product must not invent sources, metrics, or confidence scores.
- Deleted content must be removed from active retrieval immediately, with a documented retention policy.
- Logs should capture request IDs, errors, latency, and service versions while minimizing sensitive content.

These are product requirements, not a legal compliance certification. The data owner and legal team must confirm the final policy before real customer data is used.

## Pilot success criteria

The pilot is ready when:

- Users can complete a question → evidence review → decision brief workflow without assistance.
- Permission tests show no cross-workspace data access.
- Supported documents parse correctly and failures are understandable.
- Material business claims have correct supporting sources in the evaluation set.
- Unavailable or restricted data produces a clear limitation instead of a fabricated answer.
- Refresh, reconnect, stop, and retry do not duplicate or corrupt messages.
- Response speed, uptime, model cost, and integration failures are measurable.

## Success measures

The main measure is the number of weekly active users who complete an evidence-backed task: an ARIA conversation followed by source inspection and a saved or exported brief.

Also measure activation, week-four return rate, answer quality, citation quality, latency, uptime, cost per task, negative feedback, and privacy incidents.

## Delivery sequence

### Phase 1: Confirm the foundation

Choose the first user and workflow. Confirm ARIA access, data permissions, integration contract, hosting region, and evaluation questions.

### Phase 2: Build the chat foundation

Build sign-in, workspaces, chat history, streaming, file uploads, errors, and basic observability using labeled synthetic data where necessary.

### Phase 3: Connect ARIA

Add the real ARIA capability, source references, limitations, calculations, decision briefs, feedback, and access-control tests.

### Phase 4: Run an invited pilot

Use a small business cohort, review answer quality with domain experts, measure repeat use and cost, and fix trust or privacy problems before expanding.

## Decisions still needed

1. Who is the first paying or sponsoring customer?
2. What single business workflow should the pilot prove?
3. Is ARIA Chat standalone, part of Atlas, or embedded in a partner app?
4. Which ARIA services and datasets are available now?
5. Which markets, languages, hosting regions, and model providers are allowed?
6. What data retention, support, and commercial model will the pilot use?

Until these decisions are confirmed, this document is a product direction and MVP scope, not a final technical commitment.
