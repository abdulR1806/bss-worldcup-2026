Review this pull request for the Credit Divisions World Cup Leaderboard project.

Prioritize serious issues that could break the competition:

- CSV schema changes that make `scripts/validate_data.py` fail.
- Scoring regressions for W/L/D predictions.
- Result update logic that fetches before `resultFetchAfterWib`.
- Any path that exposes API keys or YouTube stream keys.
- Static website changes that require a dev server, npm build, or network fetch.
- JavaScript errors that would stop `site/index.html` from working via `file://`.
- GitHub Actions changes that skip validation before publishing data.

Respond with findings first. Include file paths and line references when possible.
