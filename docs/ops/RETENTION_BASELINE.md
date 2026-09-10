# Retention baseline

- Captured: 2026-09-10T15:57:11.044Z
- Base: https://game.pokeauto.online
- Health: status 200, version 0.41.2
- Dex board rows (API, no client padding): 1
- Dex rows that look real: 1
- Top real score: 3
- Power board status: 200
- Ingest session_start: HTTP 200 ok=true

## Reading

Public leaderboards are the only heat signal without D1. A single-digit real row count means DAU is not yet measurable from the client. Query `analytics_events` with wrangler when credentials are available:

```
SELECT event, COUNT(*) AS n FROM analytics_events GROUP BY event;
SELECT COUNT(DISTINCT sessionId) AS sessions FROM analytics_events WHERE event = 'session_start';
```

This file is overwritten by `node scripts/retention-baseline.mjs`.
