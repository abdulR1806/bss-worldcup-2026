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
- Keep the frontend simple: static HTML, CSS, and vanilla JavaScript only.
- When changing UI behavior, update README/docs if the local testing or deployment workflow changes.
- Keep `site/assets/logo-cropped.png` as the website logo/avatar unless the project owner provides a new logo.
- Preserve the generated metadata timestamp behavior for `Pembaruan terakhir`.

## Verification

Run these checks from the project root:

```bash
python scripts/validate_data.py
python scripts/test_scoring.py
python scripts/build_site_data.py
```

For rendered UI checks, use the local scripted browser path:

```bash
python -m http.server 8765 --directory site
venv\Scripts\python.exe scripts\verify_site_playwright.py
```
