from __future__ import annotations

import argparse
import os
from pathlib import Path

from update_results import DEFAULT_COMPETITION_CODE, DEFAULT_SEASON, fetch_matches, load_local_env


def format_match_line(match: dict) -> str:
    home = match.get("homeTeam", {}).get("name", "TBD")
    away = match.get("awayTeam", {}).get("name", "TBD")
    utc_date = match.get("utcDate", "unknown date")
    stage = match.get("stage", "unknown stage")
    status = match.get("status", "unknown")
    return f"{utc_date} [{stage}] {home} vs {away} ({status})"


def main() -> None:
    parser = argparse.ArgumentParser(description="Check football-data.org connection and World Cup 2026 schedule access.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument("--limit", type=int, default=5, help="Number of matches to print. Defaults to 5.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    load_local_env(root)

    api_token = os.getenv("FOOTBALL_DATA_TOKEN", "")
    competition_code = os.getenv("FOOTBALL_DATA_COMPETITION_CODE", DEFAULT_COMPETITION_CODE)
    season = os.getenv("FOOTBALL_DATA_SEASON", DEFAULT_SEASON)

    if not api_token:
        raise SystemExit("ERROR: Set FOOTBALL_DATA_TOKEN in your shell or local .env file.")

    matches, headers = fetch_matches(api_token, competition_code, season)
    print(f"OK: connected to football-data.org for competition={competition_code} season={season}.")
    print(f"Matches returned: {len(matches)}")
    if headers.get("x-authenticated-client"):
        print(f"Authenticated client: {headers['x-authenticated-client']}")
    if headers.get("x-requests-available") or headers.get("x-requestcounter-reset"):
        print(
            "Quota: "
            f"available={headers.get('x-requests-available') or 'unknown'} "
            f"reset={headers.get('x-requestcounter-reset') or 'unknown'}"
        )

    for match in matches[: max(args.limit, 0)]:
        print(f"- {format_match_line(match)}")


if __name__ == "__main__":
    main()
