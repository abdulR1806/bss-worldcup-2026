# AGENTS.md

## Project Context

This repository contains a local-first static leaderboard for the Credit Divisions World Cup prediction competition.

The website must stay usable by opening `site/index.html` directly in Chrome. Do not introduce React, npm build tools, backend services, or browser `fetch()` for local data unless the project owner explicitly changes that requirement.

## Review Guidelines

- Treat scoring regressions as high priority.
- Confirm each participant has exactly 72 predictions.
- Preserve the rule: 1 point for each correct W/L/D prediction.
- Preserve the rule: pending matches are excluded from score.
- Preserve the rule: API result fetching starts only after `resultFetchAfterWib`.
- Never commit API keys, YouTube stream keys, or private participant identity data.
- Prefer Indonesian UI copy for the website.

## Verification

Run these checks from the project root:

```bash
python scripts/validate_data.py
python scripts/test_scoring.py
python scripts/build_site_data.py
```
