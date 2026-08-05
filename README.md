# Argos Web

Angular frontend for Argos, a private quantitative research and paper-trading decision-support platform. The initial dashboard is read-only and presents the authoritative values returned by `GET /dashboard/overview`; it does not recalculate Scores, Decisions, portfolio valuation, performance, or P&L.

## Requirements

- Node.js `22.22.3+`, `24.15.0+`, or `26+`
- npm 8+
- A running `argos-api`

## Install and run

```sh
npm ci
npm start
```

Open `http://localhost:4200`.

Development uses the API base URL defined in `src/environments/environment.ts`. The production
Docker build requires `API_BASE_URL` and generates `src/environments/environment.production.ts`
for Angular file replacement. A future same-origin architecture with a reverse proxy would require
an explicit change to this configuration. The API must allow the frontend origin in its CORS
configuration.

Do not place the Railway URL inside components or services.

## Authentication and browser sessions

`/login` is the only unauthenticated SPA route. The dashboard, evaluation, Strategy
Research, and generic instrument-detail routes are activated only after one shared
credentialed `GET /auth/me` restoration request succeeds. The authenticated shell shows
the configured administrator identity and provides logout on every private route.

Login sends only `username` and `password`, reads the exposed `X-CSRF-Token` response
header, and verifies the browser session immediately through `/auth/me`. The public
principal and CSRF proof live only in process memory. The frontend never reads API
cookies and never stores the JWT, CSRF proof, credentials, or private API responses in
local storage, session storage, IndexedDB, URLs, or logs. A full reload intentionally
restores identity and a fresh in-memory proof from `/auth/me`.

A `401` restoration result means there is no active session and shows the normal login
form. Network, server, malformed-response, or missing-CSRF failures are treated as an
unavailable authentication service instead; the login page shows an explicit warning and
a **Retry session** action without issuing duplicate restoration requests.

The shared HTTP interceptor sends credentials to the exact configured API origin on
every request and adds the current CSRF proof to authenticated POST, PUT, PATCH, and
DELETE requests. It never credentials static assets, frontend-origin requests, or URLs
that merely share a string prefix with the API origin. Backend enforcement remains the
authoritative security boundary; guarded routes prevent private UI construction and
data loading but do not replace API authentication.

Railway's separate `argos-web` and `argos-api` hosts are cross-site. Production therefore
depends on the API's host-only `Secure; SameSite=None` cookies and on browser support for
cross-site cookies. Browsers configured to block third-party cookies may prevent session
establishment; the login page reports that condition explicitly. Local HTTP uses the
backend's `SameSite=Lax` development policy.

## Railway deployment

1. Create a Railway service from `EduBeghe/argos-web`. Railway detects the repository's
   `Dockerfile` and serves the production Angular build through Caddy.
2. Configure the build variable without quotes:

   ```text
   API_BASE_URL=https://<public-argos-api-domain>
   ```

3. Generate a public domain for the web service.
4. Add that public `argos-web` origin to the allowed CORS origins in `argos-api`.

Use the public API domain, not Railway's private service URL, because visitors' browsers cannot
resolve private Railway networking. `API_BASE_URL` is embedded into the Angular bundle at build
time, so changing it requires a new build and deployment. Its value must be only the public HTTP or
HTTPS origin, such as `https://dominio`, without a path, query, or fragment. Do not place secrets in
this variable or in any frontend bundle.

## Quality checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm test -- --watch=false
npm run build
```

The Angular 22 scaffold uses standalone components, strict TypeScript, routing, HttpClient, Signals, SCSS, ESLint, Prettier, and Vitest.

## Dashboard contract

The `/` route makes one request to `{API_BASE_URL}/dashboard/overview`. Instrument cards are generated from the ordered catalog response and keyed by asset, provider, market type, and interval. There are no BTC- or ETH-specific components and no requests per instrument.

When the overview contains an active Paper Run, the dashboard makes one additional request to
`/paper/equity-snapshots` for the latest 500 persisted snapshots. Results are ordered chronologically
for display. When fewer than 500 snapshots are available, equity history starts at the run's initial
cash and continues through confirmed 30-minute snapshot boundaries. A full 500-point response is
treated as a potentially truncated recent window and is not connected back to the run start. The
current portfolio valuation is shown separately because it may be newer and is not inserted into the
historical series.

The chart uses a contextual Y-axis domain with readable USDT ticks; it does not force the scale to
zero. Its X axis is a continuous UTC timeline with evenly distributed temporal references and a
reduced tick set on narrow screens. The dashed reference line marks initial equity and is explained
by a compact legend outside the plot.

Visible financial metrics and technical indicators provide reusable contextual help on hover,
keyboard focus, and click or tap. The explanations offer educational context about interpretation
and limitations; they are not financial advice. Definitions live in
`src/app/shared/metrics/metric-definitions.ts` so components use one typed source instead of
duplicating explanation text.

The dashboard uses progressive disclosure to keep the first view focused. Its primary Paper Trading
summary shows current equity, total P&L, total return, and maximum drawdown; cash, position value,
run configuration, simulated cost rates, and persisted-performance context remain available through
the native **Run details** disclosure. Equity history follows immediately. Each catalog-driven
instrument card presents a compact score, decision, position, and exposure summary, with the existing
technical and decision evidence available under **More details**. Every card links to the generic
instrument-detail route using its complete catalog identity.

## Generic instrument details

`/instruments/detail` requires `asset`, `provider`, `market_type`, and `interval` query parameters.
The canonical asset may contain `/`, so identity remains in the query string rather than a path
segment. The optional `range` parameter accepts `6h`, `24h`, or `72h` and defaults to `24h` only
when the complete identity is valid. Range changes remain in the URL and survive refresh.

The page requests bounded, ascending, synchronized UTC windows from:

- `GET /market/candles`
- `GET /market/scores`
- `GET /market/decisions`
- `GET /paper/trades`

The instrument catalog validates and describes the complete identity independently from the
dashboard overview. The overview supplies optional current Score, Decision, freshness, and position
context; if it is unavailable, persisted histories remain usable and the current position is shown
as unavailable. Each historical collection loads and retries independently. A failed retry preserves
and continues rendering its previously loaded data while exposing a refresh error. Persisted Scores are analytical model evidence;
Decision Snapshots are immutable strategy conclusions; Paper Trades are simulated executions. The
frontend never reconstructs one from another, and a `NO_ACTION` Decision does not create a Trade
marker. The price chart is a dependency-free close-price line with Decision and Trade markers. The
Score chart uses the authoritative `overall_score` on a fixed −1 to +1 domain. Current position P&L
and valuation come only from the dashboard's authoritative portfolio response.

Current detail-page limitations are a line price chart rather than candlesticks, the three fixed
history ranges rather than a custom date picker, and no polling, WebSockets, or mutations.

Missing Scores, Decisions, positions, candles, or an active Paper Run are normal display states. A failed refresh preserves previously loaded data. HTTP 409 is shown as unavailable valuation evidence rather than as an invented portfolio value.

Decimal strings are converted only inside pure display formatters. The original values are never reinterpreted as frontend financial calculations.

## ML Refinement

The authenticated lazy route `/ml-refinement` provides a manual-first workspace for configuring
bounded ML refinement from persisted screening evidence. It reads the authoritative contract from
`GET /optimization/ml-refinement-contract`, screening runs/results, durable refinement runs, and
paginated evaluation evidence. Mutations use the existing authenticated `HttpClient` pipeline to
enqueue, cancel, or retry refinement runs.

Queued work depends on the separately deployed backend refinement worker. The page polls a selected
queued/running run while visible, stops at terminal state, and preserves server-reported progress,
reuse, omission, budget, failure, and cancellation evidence. Evaluation classifications are research
evidence only: even `promising_for_strategy_simulation` permits later simulation but does not approve
or activate a Strategy.

Manual refinement does not itself consume protected evidence or create deployments. Supported
engines, objectives, durations, variables, validation limits, costs, and seed defaults come from
the backend contract rather than a frontend registry. Protected validation and Paper deployment are
separate, explicit workflows described below.

## Automated ML Search campaigns

The authenticated lazy routes `/ml-search-campaigns` and
`/ml-search-campaigns/:campaignId` monitor the durable `exhaustive_ohlcv_v1` workflow. The workspace
uses the authoritative campaign contract, campaign list/detail, family list/detail, cancellation,
and retry endpoints under `/optimization/ml-search-campaigns`. It does not enqueue campaigns.

Campaign pages are always server-paginated: 25 campaigns per request, 50 visible families per
request, and count-only family requests with `limit=1`. The UI never expands all 3,600 families or
downloads refinement evaluations. Categories map directly to persisted state: **Strong candidates**
uses `strong_development_candidate`; **Still competing** uses `survived`; **Near misses** uses
`discarded` at stage 4 or 3; **Early discarded** uses `discarded` at stage 2 or 1; and **Pending / in
progress** combines independent `scheduled` and `pending` counts. Composite counts sum only
non-overlapping backend totals and remain unavailable if a constituent request fails.

While a selected campaign is queued or running and the document is visible, detail and the visible
family page refresh every 30 seconds. Category counts refresh every two minutes, on manual refresh,
and once on a terminal transition. Polling stops for hidden documents, terminal campaigns, route or
selection changes, and component destruction. Refresh failures preserve the last successful panel.

The only mutations are lifecycle-aware Cancel and Retry. Cancellation requires in-page
confirmation; retry is available only for operationally failed campaigns and resumes the same
campaign with its original runtime clock. Outcomes and family evidence authorize research review
only—not Strategy activation, simulation, Paper Trading, or real trading. The backend does not
expose a global economic family ranking, so the frontend preserves deterministic server order. A
best evaluation is shown only as an abbreviated persisted reference because its refinement-run ID
is unavailable and a correct deep link cannot be constructed.

## Protected final validation and Paper Strategies

Strong stage-4 family detail adds a lazy four-step workflow: authoritative development audit,
temporal-manifest reconstruction, one-shot protected 2024-2026 final validation, and deployment of
completed passed current-contract evidence. The UI does not bulk validate, retune with protected
results, retry legacy contracts, or calculate scientific classifications. It labels current evidence
from the exact simulation-version 2, policy-version 1, 1,800-second contract; legacy evidence remains
readable but cannot be retried or deployed.

The authenticated lazy `/paper-strategies` workspace lists isolated simulated deployments with
cursor pagination. It supports confirmed Pause, Resume, Make primary, and irreversible Archive only
when the backend lifecycle permits them. Mutations refresh authoritative records rather than
inventing state. `current_cash` is cash, never equity or P&L. Multiple deployments may run in
parallel; making one primary does not pause another. Archive preserves history, performs no
liquidation, and is not deletion. No action contacts an exchange or uses real money.

## Strategy evaluation

The `/evaluation` route loads the authoritative read-only `GET /paper/evaluation` response and
keeps the dashboard focused by placing detailed Strategy evidence on a dedicated page. Its primary
summary compares Strategy return and P&L with the `equal_weight_buy_and_hold_v1` reference; secondary
Position, Decision, Trade, cost, benchmark, instrument, and methodology evidence remains collapsed
in independent disclosures.

The benchmark is fully invested and does not share the Strategy's exposure or risk profile. It
compares outcomes, not equal risk: entry fees and simulated entry slippage are included, while no
hypothetical exit cost is deducted. The comparison is not alpha or a profitability guarantee.

Unavailable statuses and null financial values are rendered as explicit evidence states rather than
zero. A missing active Paper Run is a normal empty state. Failed refreshes preserve the previous
successful evaluation. Financial values remain Decimal strings and are formatted for presentation;
the frontend does not reconstruct or recalculate authoritative metrics. The return chart converts
strings to numbers only for dependency-free SVG geometry.

The evaluation page intentionally excludes mutations, polling, WebSockets, backtesting, strategy
editing, Risk Engine functionality, and backend changes.

## Strategy Research

The lazy `/strategies` route is a read-only research workspace with five sections: **Overview**,
**Predictive Evidence**, **Near Misses**, **Targeted Refinement**, and **Historical Candidates**.
Its instrument selector uses the complete persisted identity and defaults to the newest completed
run; when several runs exist, the user can select the exact historical run and range.

Only run metadata loads initially. Diagnostics, actionable or diagnostic near misses, targeted
refinement, and candidate details load when their section or detail is opened. Panel failures remain
isolated and retries preserve other successful evidence. A 404 for predictive diagnostics or
targeted refinement is a normal legacy/unavailable state. Predictive and targeted requests use the
selected run's `predictive_edge_run_id`; historical candidate identity continues to use the separate
edge-guided run ID.

Targeted refinement presents the persisted qualification funnel from generated configurations
through training, validation, isolated test, and confirmation with exact counts. Historical
candidates retain their existing filters, pagination, chart, and details. Nullable validation or
test evidence is displayed as **Not evaluated**, never inferred as zero or success.

All candidate metrics, explanations, parameters, and classifications come from the optimization
API. The frontend formats Decimal strings for display but does not recompute financial evidence,
run historical simulations, promote or activate candidates, or imply that historical confirmation
guarantees future performance. Strategy activation and adaptive multifeature discovery are outside
this frontend PR.

## Current limitations

Current limitations include polling rather than WebSockets, strategy editing, catalog
administration, SPY, Alpaca, backtesting, automatic deployment or baseline retirement, and
real-money execution.
