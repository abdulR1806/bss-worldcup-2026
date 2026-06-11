from __future__ import annotations

import argparse
import csv
import json
import os
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from build_site_data import write_site_data


WIB = timezone(timedelta(hours=7))
FINAL_MATCH_STATUSES = {"FINISHED", "AWARDED"}
DEFAULT_COMPETITION_CODE = "WC"
DEFAULT_SEASON = "2026"
API_BASE_URL = "https://api.football-data.org/v4"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def load_local_env(root: Path) -> None:
    env_path = root / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def normalize(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().replace("-", " ").split())


def load_aliases(root: Path) -> dict[str, set[str]]:
    path = root / "data" / "team_aliases.csv"
    if not path.exists():
        return {}
    aliases: dict[str, set[str]] = {}
    for row in read_csv(path):
        template_key = normalize(row["templateTeam"])
        api_values = {
            normalize(candidate)
            for candidate in row["apiTeam"].split("|")
            if candidate.strip()
        }
        aliases.setdefault(template_key, set()).update(api_values or {template_key})
    return aliases


def local_team_keys(team: str, aliases: dict[str, set[str]]) -> set[str]:
    normalized = normalize(team)
    keys = {normalized}
    keys.update(aliases.get(normalized, set()))
    return {key for key in keys if key}


def api_team_keys(team: dict[str, str]) -> set[str]:
    keys = {
        normalize(team.get("name", "")),
        normalize(team.get("shortName", "")),
        normalize(team.get("tla", "")),
    }
    return {key for key in keys if key}


def api_headers(response: urllib.request.addinfourl) -> dict[str, str]:
    return {
        "x-requests-available": response.headers.get("X-RequestsAvailable", ""),
        "x-requestcounter-reset": response.headers.get("X-RequestCounter-Reset", ""),
        "x-authenticated-client": response.headers.get("X-Authenticated-Client", ""),
    }


def fetch_matches(api_token: str, competition_code: str, season: str) -> tuple[list[dict], dict[str, str]]:
    request = urllib.request.Request(
        f"{API_BASE_URL}/competitions/{competition_code}/matches?season={season}",
        headers={"X-Auth-Token": api_token},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
        headers = api_headers(response)
    return payload.get("matches", []), headers


def find_match(match: dict[str, str], fixtures: list[dict], aliases: dict[str, set[str]]) -> dict | None:
    home_keys = local_team_keys(match["homeTeam"], aliases)
    away_keys = local_team_keys(match["awayTeam"], aliases)
    for fixture in fixtures:
        teams = fixture.get("homeTeam", {}), fixture.get("awayTeam", {})
        api_home = api_team_keys(teams[0])
        api_away = api_team_keys(teams[1])
        if home_keys & api_home and away_keys & api_away:
            return fixture
    return None


def result_code(match: dict) -> str:
    score = match.get("score", {})
    winner = str(score.get("winner", "")).upper()
    if winner == "HOME_TEAM":
        return "W"
    if winner == "AWAY_TEAM":
        return "L"
    if winner == "DRAW":
        return "D"

    full_time = score.get("fullTime", {}) or {}
    home_score = full_time.get("home")
    away_score = full_time.get("away")
    if home_score is None or away_score is None:
        return "D"
    if home_score > away_score:
        return "W"
    if home_score < away_score:
        return "L"
    return "D"


def score_value(score: dict, key: str) -> int | None:
    value = score.get(key)
    return int(value) if value is not None else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Update results after each match passes the 100-minute fetch window.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument("--now-wib", default="", help="Override current WIB time, e.g. 2026-06-12T04:00:00+07:00.")
    parser.add_argument("--dry-run", action="store_true", help="Print eligible updates without writing data/results.csv.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    load_local_env(root)
    api_token = os.getenv("FOOTBALL_DATA_TOKEN", "")
    competition_code = os.getenv("FOOTBALL_DATA_COMPETITION_CODE", DEFAULT_COMPETITION_CODE)
    season = os.getenv("FOOTBALL_DATA_SEASON", DEFAULT_SEASON)

    if not api_token:
        print("No FOOTBALL_DATA_TOKEN configured. Skipping result update.")
        if not args.dry_run:
            target = write_site_data(root)
            print(f"Refreshed browser data: {target}")
        return

    now = parse_iso(args.now_wib) if args.now_wib else datetime.now(WIB)
    matches = read_csv(root / "data" / "matches.csv")
    results = read_csv(root / "data" / "results.csv")
    aliases = load_aliases(root)
    result_by_match = {row["matchId"]: row for row in results}
    fixtures: list[dict] | None = None
    response_headers: dict[str, str] = {}
    updated = 0

    for match in matches:
        existing = result_by_match.get(match["id"])
        if existing and existing["status"].upper() == "FINAL":
            continue

        fetch_after = parse_iso(match["resultFetchAfterWib"])
        if now < fetch_after:
            continue

        if fixtures is None:
            fixtures, response_headers = fetch_matches(api_token, competition_code, season)
            available = response_headers.get("x-requests-available", "")
            reset = response_headers.get("x-requestcounter-reset", "")
            if available or reset:
                print(f"football-data quota: available={available or 'unknown'} reset={reset or 'unknown'}")

        fixture = find_match(match, fixtures, aliases)
        if not fixture:
            print(f"No API fixture match found for {match['id']} {match['homeTeam']} vs {match['awayTeam']}")
            continue

        status = str(fixture.get("status", "")).upper()
        if status not in FINAL_MATCH_STATUSES:
            print(f"{match['id']} found but not final yet: {status or 'unknown'}")
            continue

        score = fixture.get("score", {})
        full_time = score.get("fullTime", {}) or {}
        home_score = score_value(full_time, "home")
        away_score = score_value(full_time, "away")
        if home_score is None or away_score is None:
            print(f"{match['id']} final but missing full-time score.")
            continue
        row = existing or {"matchId": match["id"]}
        row.update(
            {
                "matchId": match["id"],
                "status": "FINAL",
                "homeScore": str(home_score),
                "awayScore": str(away_score),
                "result": result_code(fixture),
                "source": "football-data.org",
                "updatedAt": now.isoformat(timespec="seconds"),
            }
        )
        result_by_match[match["id"]] = row
        updated += 1
        print(f"Updated {match['id']}: {home_score}-{away_score}")

    if args.dry_run:
        print(f"Dry run complete. Would update {updated} result rows.")
        return

    ordered_results = [
        result_by_match.get(
            match["id"],
            {"matchId": match["id"], "status": "PENDING", "homeScore": "", "awayScore": "", "result": "", "source": "", "updatedAt": ""},
        )
        for match in matches
    ]
    write_csv(
        root / "data" / "results.csv",
        ordered_results,
        ["matchId", "status", "homeScore", "awayScore", "result", "source", "updatedAt"],
    )
    print(f"Updated {updated} result rows.")
    target = write_site_data(root)
    print(f"Refreshed browser data: {target}")


if __name__ == "__main__":
    main()
