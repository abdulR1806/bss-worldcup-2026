from __future__ import annotations

import argparse
import csv
import json
import os
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


WIB = timezone(timedelta(hours=7))
FINAL_API_STATUSES = {"FT", "AET", "PEN"}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def normalize(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().replace("-", " ").split())


def load_aliases(root: Path) -> dict[str, str]:
    path = root / "data" / "team_aliases.csv"
    if not path.exists():
        return {}
    aliases = {}
    for row in read_csv(path):
        aliases[normalize(row["templateTeam"])] = normalize(row["apiTeam"])
    return aliases


def team_key(team: str, aliases: dict[str, str]) -> str:
    normalized = normalize(team)
    return aliases.get(normalized, normalized)


def fetch_fixtures(api_key: str, league_id: str, season: str, date: str) -> list[dict]:
    query = urllib.parse.urlencode({"league": league_id, "season": season, "date": date})
    request = urllib.request.Request(
        f"https://v3.football.api-sports.io/fixtures?{query}",
        headers={"x-apisports-key": api_key},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload.get("response", [])


def find_fixture(match: dict[str, str], fixtures: list[dict], aliases: dict[str, str]) -> dict | None:
    home_key = team_key(match["homeTeam"], aliases)
    away_key = team_key(match["awayTeam"], aliases)
    for fixture in fixtures:
        teams = fixture.get("teams", {})
        api_home = team_key(teams.get("home", {}).get("name", ""), aliases)
        api_away = team_key(teams.get("away", {}).get("name", ""), aliases)
        if api_home == home_key and api_away == away_key:
            return fixture
    return None


def result_code(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "W"
    if home_score < away_score:
        return "L"
    return "D"


def main() -> None:
    parser = argparse.ArgumentParser(description="Update results after each match passes the 100-minute fetch window.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument("--now-wib", default="", help="Override current WIB time, e.g. 2026-06-12T04:00:00+07:00.")
    parser.add_argument("--dry-run", action="store_true", help="Print eligible updates without writing data/results.csv.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    api_key = os.getenv("API_FOOTBALL_KEY", "")
    league_id = os.getenv("API_FOOTBALL_LEAGUE_ID", "")
    season = os.getenv("API_FOOTBALL_SEASON", "2026")

    if not api_key or not league_id:
        print("No API_FOOTBALL_KEY or API_FOOTBALL_LEAGUE_ID configured. Skipping result update.")
        return

    now = parse_iso(args.now_wib) if args.now_wib else datetime.now(WIB)
    matches = read_csv(root / "data" / "matches.csv")
    results = read_csv(root / "data" / "results.csv")
    aliases = load_aliases(root)
    result_by_match = {row["matchId"]: row for row in results}
    fixtures_by_date: dict[str, list[dict]] = {}
    updated = 0

    for match in matches:
        existing = result_by_match.get(match["id"])
        if existing and existing["status"].upper() == "FINAL":
            continue

        fetch_after = parse_iso(match["resultFetchAfterWib"])
        if now < fetch_after:
            continue

        date = match["kickoffWib"][:10]
        if date not in fixtures_by_date:
            fixtures_by_date[date] = fetch_fixtures(api_key, league_id, season, date)

        fixture = find_fixture(match, fixtures_by_date[date], aliases)
        if not fixture:
            print(f"No API fixture match found for {match['id']} {match['homeTeam']} vs {match['awayTeam']}")
            continue

        status = fixture.get("fixture", {}).get("status", {}).get("short", "")
        if status not in FINAL_API_STATUSES:
            print(f"{match['id']} found but not final yet: {status or 'unknown'}")
            continue

        goals = fixture.get("goals", {})
        home_score = int(goals.get("home"))
        away_score = int(goals.get("away"))
        row = existing or {"matchId": match["id"]}
        row.update(
            {
                "matchId": match["id"],
                "status": "FINAL",
                "homeScore": str(home_score),
                "awayScore": str(away_score),
                "result": result_code(home_score, away_score),
                "source": "API-FOOTBALL",
                "updatedAt": now.isoformat(timespec="seconds"),
            }
        )
        result_by_match[match["id"]] = row
        updated += 1
        print(f"Updated {match['id']}: {home_score}-{away_score}")

    if args.dry_run:
        print(f"Dry run complete. Would update {updated} result rows.")
        return

    ordered_results = [result_by_match.get(match["id"], {"matchId": match["id"], "status": "PENDING", "homeScore": "", "awayScore": "", "result": "", "source": "", "updatedAt": ""}) for match in matches]
    write_csv(
        root / "data" / "results.csv",
        ordered_results,
        ["matchId", "status", "homeScore", "awayScore", "result", "source", "updatedAt"],
    )
    print(f"Updated {updated} result rows.")


if __name__ == "__main__":
    main()
