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

## Current limitations

This PR intentionally excludes authentication, polling, WebSockets, Paper Trading mutations, strategy editing, catalog administration, SPY, Alpaca, and backtesting.
