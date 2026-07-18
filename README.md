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

The development API base URL is defined in `src/environments/environment.ts`. Production builds use `src/environments/environment.production.ts` through Angular file replacement. Set `apiBaseUrl` to the deployed API origin, or leave it empty when the API is available on the same origin through a reverse proxy. The API must allow the frontend origin in its CORS configuration.

Do not place the Railway URL inside components or services.

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

Missing Scores, Decisions, positions, candles, or an active Paper Run are normal display states. A failed refresh preserves previously loaded data. HTTP 409 is shown as unavailable valuation evidence rather than as an invented portfolio value.

Decimal strings are converted only inside pure display formatters. The original values are never reinterpreted as frontend financial calculations.

## Current limitations

This PR intentionally excludes authentication, charts, polling, WebSockets, Paper Trading mutations, strategy editing, catalog administration, SPY, Alpaca, backtesting, and deployment configuration.
