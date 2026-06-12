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
THESPORTSDB_API_BASE_URL = "https://www.thesportsdb.com/api/v1/json"
DEFAULT_THESPORTSDB_API_KEY = "123"
DEFAULT_THESPORTSDB_LEAGUE_ID = "4429"


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
    url = f"{API_BASE_URL}/competitions/{competition_code}/matches?season={season}"
    print(f"\n{'='*80}")
    print(f"API REQUEST: GET {url}")
    print(f"{'='*80}")
    request = urllib.request.Request(
        url,
        headers={"X-Auth-Token": api_token},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw_body = response.read().decode("utf-8")
        payload = json.loads(raw_body)
        headers = api_headers(response)

    # Log response headers
    print(f"\nAPI RESPONSE HEADERS:")
    for key, value in headers.items():
        print(f"  {key}: {value}")

    # Log competition info
    competition = payload.get("competition", {})
    print(f"\nAPI COMPETITION: {competition.get('name', 'N/A')} (code={competition.get('code', 'N/A')})")
    print(f"API RESULT COUNT: {payload.get('resultSet', {}).get('count', 'N/A')} matches returned")

    matches = payload.get("matches", [])
    # Log full fixture list summary
    print(f"\n{'='*80}")
    print(f"FULL API FIXTURE DUMP ({len(matches)} matches):")
    print(f"{'='*80}")
    for i, m in enumerate(matches):
        home = m.get("homeTeam", {})
        away = m.get("awayTeam", {})
        home_name = str(home.get("name") or "?")
        away_name = str(away.get("name") or "?")
        score = m.get("score", {})
        ft = score.get("fullTime", {}) or {}
        ht = score.get("halfTime", {}) or {}
        utc_date = m.get("utcDate", "N/A")
        status = m.get("status", "N/A")
        matchday = m.get("matchday", "N/A")
        group_name = m.get("group", "N/A")
        winner = score.get("winner", "N/A")
        home_ft = ft.get("home", "--")
        away_ft = ft.get("away", "--")
        home_ht = ht.get("home", "--")
        away_ht = ht.get("away", "--")
        print(
            f"  [{i+1:3d}] {status:<12} | "
            f"{home_name:>25} {home_ft}-{away_ft} {away_name:<25} | "
            f"HT:{home_ht}-{away_ht} | winner={winner} | "
            f"group={group_name} md={matchday} | {utc_date}"
        )
    print(f"{'='*80}\n")

    return matches, headers


def fetch_sportsdb_events(api_key: str, league_id: str, season: str) -> list[dict]:
    url = f"{THESPORTSDB_API_BASE_URL}/{api_key}/eventsseason.php?id={league_id}&s={season}"
    print(f"\n{'='*80}")
    print(f"THESPORTSDB REQUEST: GET {url}")
    print(f"{'='*80}")
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request, timeout=30) as response:
        raw_body = response.read().decode("utf-8")
        payload = json.loads(raw_body)

    events = payload.get("events") or []
    print(f"THESPORTSDB EVENT COUNT: {len(events)} events returned")
    print(f"\n{'='*80}")
    print(f"THESPORTSDB EVENT DUMP ({len(events)} events):")
    print(f"{'='*80}")
    for i, event in enumerate(events):
        home_name = str(event.get("strHomeTeam") or "?")
        away_name = str(event.get("strAwayTeam") or "?")
        home_score = event.get("intHomeScore") or "--"
        away_score = event.get("intAwayScore") or "--"
        status = event.get("strStatus") or "N/A"
        timestamp = event.get("strTimestamp") or event.get("dateEvent") or "N/A"
        print(f"  [{i+1:3d}] {status:<18} | {home_name:>25} {home_score}-{away_score} {away_name:<25} | {timestamp}")
    print(f"{'='*80}\n")
    return events

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


def sportsdb_team_keys(event: dict, key: str) -> set[str]:
    value = event.get(key)
    return {normalize(str(value))} if value else set()


def sportsdb_score_value(event: dict, key: str) -> int | None:
    value = event.get(key)
    if value in (None, ""):
        return None
    return int(value)


def sportsdb_event_kickoff(event: dict) -> datetime | None:
    timestamp = event.get("strTimestamp")
    if timestamp:
        value = str(timestamp).replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(WIB)
        except ValueError:
            pass

    date_event = event.get("dateEvent")
    if date_event:
        try:
            return datetime.fromisoformat(str(date_event)).replace(tzinfo=WIB)
        except ValueError:
            return None
    return None


def kickoff_distance(match: dict[str, str], event: dict) -> float:
    event_kickoff = sportsdb_event_kickoff(event)
    if event_kickoff is None:
        return float("inf")
    local_kickoff = parse_iso(match["kickoffWib"])
    return abs((event_kickoff - local_kickoff).total_seconds())


def find_sportsdb_event(match: dict[str, str], events: list[dict], aliases: dict[str, set[str]]) -> tuple[dict, bool] | None:
    home_keys = local_team_keys(match["homeTeam"], aliases)
    away_keys = local_team_keys(match["awayTeam"], aliases)
    candidates: list[tuple[float, dict, bool]] = []
    for event in events:
        event_home = sportsdb_team_keys(event, "strHomeTeam")
        event_away = sportsdb_team_keys(event, "strAwayTeam")
        if home_keys & event_home and away_keys & event_away:
            candidates.append((kickoff_distance(match, event), event, False))
        elif home_keys & event_away and away_keys & event_home:
            candidates.append((kickoff_distance(match, event), event, True))

    if not candidates:
        return None

    _distance, event, is_reversed = min(candidates, key=lambda item: item[0])
    return event, is_reversed


def sportsdb_scores(event: dict, is_reversed: bool) -> tuple[int | None, int | None]:
    home_score = sportsdb_score_value(event, "intHomeScore")
    away_score = sportsdb_score_value(event, "intAwayScore")
    if is_reversed:
        return away_score, home_score
    return home_score, away_score


def diagnose_sportsdb_match(match: dict[str, str], events: list[dict], aliases: dict[str, set[str]]) -> None:
    print(f"\n{'='*80}")
    print(f"THESPORTSDB DIAGNOSTIC FOR {match['id']} ({match['homeTeam']} vs {match['awayTeam']})")
    print(f"{'='*80}")
    print(f"CSV kickoffWib: {match['kickoffWib']}")
    print(f"CSV resultFetchAfterWib: {match['resultFetchAfterWib']}")
    print(f"CSV home keys: {sorted(local_team_keys(match['homeTeam'], aliases))}")
    print(f"CSV away keys: {sorted(local_team_keys(match['awayTeam'], aliases))}")

    sportsdb_match = find_sportsdb_event(match, events, aliases)
    if not sportsdb_match:
        print("No matching TheSportsDB event found.")
        print(f"{'='*80}\n")
        return

    event, is_reversed = sportsdb_match
    home_score, away_score = sportsdb_scores(event, is_reversed)
    print(f"Matched event id: {event.get('idEvent', 'N/A')}")
    print(f"Matched event: {event.get('strEvent', 'N/A')}")
    print(f"TheSportsDB teams: {event.get('strHomeTeam', 'N/A')} vs {event.get('strAwayTeam', 'N/A')}")
    print(f"TheSportsDB timestamp: {event.get('strTimestamp') or event.get('dateEvent') or 'N/A'}")
    print(f"TheSportsDB status: {event.get('strStatus', 'N/A')}")
    print(f"TheSportsDB raw score: {event.get('intHomeScore', '')}-{event.get('intAwayScore', '')}")
    print(f"Reversed home/away mapping: {is_reversed}")
    print(f"CSV-mapped score: {home_score if home_score is not None else '--'}-{away_score if away_score is not None else '--'}")
    if home_score is not None and away_score is not None:
        print(f"CSV-mapped W/L/D result: {result_code_from_scores(home_score, away_score)}")
    else:
        print("CSV-mapped W/L/D result: pending/no usable score")
    print(f"{'='*80}\n")


def result_code_from_scores(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "W"
    if home_score < away_score:
        return "L"
    return "D"


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
    return result_code_from_scores(int(home_score), int(away_score))


def score_value(score: dict, key: str) -> int | None:
    value = score.get(key)
    return int(value) if value is not None else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Update results after each match passes the 100-minute fetch window.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument("--now-wib", default="", help="Override current WIB time, e.g. 2026-06-12T04:00:00+07:00.")
    parser.add_argument("--dry-run", action="store_true", help="Print eligible updates without writing data/results.csv.")
    parser.add_argument("--diagnose-sportsdb-match-id", default="", help="Fetch TheSportsDB and print the match mapping for a CSV match ID without writing data.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    load_local_env(root)
    api_token = os.getenv("FOOTBALL_DATA_TOKEN", "")
    competition_code = os.getenv("FOOTBALL_DATA_COMPETITION_CODE", DEFAULT_COMPETITION_CODE)
    season = os.getenv("FOOTBALL_DATA_SEASON", DEFAULT_SEASON)
    sportsdb_api_key = os.getenv("THESPORTSDB_API_KEY", DEFAULT_THESPORTSDB_API_KEY)
    sportsdb_league_id = os.getenv("THESPORTSDB_LEAGUE_ID", DEFAULT_THESPORTSDB_LEAGUE_ID)

    if not api_token and not sportsdb_api_key:
        print("No FOOTBALL_DATA_TOKEN or THESPORTSDB_API_KEY configured. Skipping result update.")
        if not args.dry_run:
            target = write_site_data(root)
            print(f"Refreshed browser data: {target}")
        return
    if not api_token:
        print("No FOOTBALL_DATA_TOKEN configured. TheSportsDB fallback will be used for eligible matches only.")

    now = parse_iso(args.now_wib) if args.now_wib else datetime.now(WIB)
    print(f"\nCurrent WIB time: {now.isoformat(timespec='seconds')}")
    matches = read_csv(root / "data" / "matches.csv")
    results = read_csv(root / "data" / "results.csv")
    aliases = load_aliases(root)
    result_by_match = {row["matchId"]: row for row in results}
    fixtures: list[dict] | None = None
    sportsdb_events: list[dict] | None = None
    response_headers: dict[str, str] = {}
    updated = 0

    print(f"\nTotal matches in CSV: {len(matches)}")
    print(f"Total existing results: {len(results)}")
    final_count = sum(1 for r in results if r.get('status', '').upper() == 'FINAL')
    pending_count = sum(1 for r in results if r.get('status', '').upper() != 'FINAL')
    print(f"  FINAL: {final_count}, PENDING/other: {pending_count}")

    if args.diagnose_sportsdb_match_id:
        diagnostic_match = next((match for match in matches if match["id"] == args.diagnose_sportsdb_match_id), None)
        if diagnostic_match is None:
            raise SystemExit(f"No match found for --diagnose-sportsdb-match-id={args.diagnose_sportsdb_match_id}")
        sportsdb_events = fetch_sportsdb_events(sportsdb_api_key, sportsdb_league_id, season)
        diagnose_sportsdb_match(diagnostic_match, sportsdb_events, aliases)
        if args.dry_run:
            print("Dry-run diagnostic complete. No CSV files were written.")
            return

    print(f"\n{'='*80}")
    print(f"MATCH ELIGIBILITY CHECK:")
    print(f"{'='*80}")
    for match in matches:
        existing = result_by_match.get(match["id"])
        if existing and existing["status"].upper() == "FINAL":
            print(f"  {match['id']} {match['homeTeam']:>20} vs {match['awayTeam']:<20} -> SKIP (already FINAL)")
            continue

        fetch_after = parse_iso(match["resultFetchAfterWib"])
        if now < fetch_after:
            remaining = fetch_after - now
            mins = int(remaining.total_seconds() / 60)
            print(f"  {match['id']} {match['homeTeam']:>20} vs {match['awayTeam']:<20} -> SKIP (fetch window not open yet, opens in {mins}m at {fetch_after.isoformat(timespec='seconds')})")
            continue

        print(f"  {match['id']} {match['homeTeam']:>20} vs {match['awayTeam']:<20} -> ELIGIBLE (fetch window open since {fetch_after.isoformat(timespec='seconds')})")

        football_data_score: tuple[int, int] | None = None
        fixture: dict | None = None
        if api_token:
            if fixtures is None:
                fixtures, response_headers = fetch_matches(api_token, competition_code, season)
                available = response_headers.get("x-requests-available", "")
                reset = response_headers.get("x-requestcounter-reset", "")
                if available or reset:
                    print(f"football-data quota: available={available or 'unknown'} reset={reset or 'unknown'}")

            fixture = find_match(match, fixtures, aliases)
            if not fixture:
                home_keys = local_team_keys(match["homeTeam"], aliases)
                away_keys = local_team_keys(match["awayTeam"], aliases)
                print(f"    !! No football-data.org fixture match found for {match['id']}")
                print(f"       Local home keys: {home_keys}")
                print(f"       Local away keys: {away_keys}")
                print(f"       Searching through {len(fixtures)} football-data.org fixtures...")
                for fx in fixtures:
                    fx_home = api_team_keys(fx.get("homeTeam", {}))
                    fx_away = api_team_keys(fx.get("awayTeam", {}))
                    # Show partial matches for debugging
                    home_overlap = home_keys & fx_home
                    away_overlap = away_keys & fx_away
                    if home_overlap or away_overlap:
                        print(f"       Partial match: {fx.get('homeTeam',{}).get('name','?')} vs {fx.get('awayTeam',{}).get('name','?')} (home_overlap={home_overlap}, away_overlap={away_overlap})")
            else:
                # Log the matched fixture details
                print(f"    Matched football-data.org fixture:")
                print(f"      homeTeam: {json.dumps(fixture.get('homeTeam', {}), ensure_ascii=False)}")
                print(f"      awayTeam: {json.dumps(fixture.get('awayTeam', {}), ensure_ascii=False)}")
                print(f"      status: {fixture.get('status', 'N/A')}")
                print(f"      utcDate: {fixture.get('utcDate', 'N/A')}")
                print(f"      score: {json.dumps(fixture.get('score', {}), ensure_ascii=False)}")

                status = str(fixture.get("status", "")).upper()
                if status in FINAL_MATCH_STATUSES:
                    score = fixture.get("score", {})
                    full_time = score.get("fullTime", {}) or {}
                    home_score = score_value(full_time, "home")
                    away_score = score_value(full_time, "away")
                    if home_score is not None and away_score is not None:
                        football_data_score = (home_score, away_score)
                    else:
                        print(f"    -> {match['id']} final on football-data.org but missing full-time score; checking TheSportsDB fallback.")
                else:
                    print(f"    -> {match['id']} found on football-data.org but score is not final/available yet (status={status or 'unknown'}); checking TheSportsDB fallback.")
        else:
            print(f"    -> Skipping football-data.org lookup for {match['id']} because FOOTBALL_DATA_TOKEN is not configured; checking TheSportsDB fallback.")

        if football_data_score is not None:
            home_score, away_score = football_data_score
            row = existing or {"matchId": match["id"]}
            row.update(
                {
                    "matchId": match["id"],
                    "status": "FINAL",
                    "homeScore": str(home_score),
                    "awayScore": str(away_score),
                    "result": result_code(fixture or {}),
                    "source": "football-data.org",
                    "updatedAt": now.isoformat(timespec="seconds"),
                }
            )
            result_by_match[match["id"]] = row
            updated += 1
            print(f"Updated {match['id']} from football-data.org: {home_score}-{away_score}")
            continue

        if not sportsdb_api_key:
            print(f"    -> TheSportsDB fallback disabled because THESPORTSDB_API_KEY is empty.")
            continue

        if sportsdb_events is None:
            sportsdb_events = fetch_sportsdb_events(sportsdb_api_key, sportsdb_league_id, season)

        sportsdb_match = find_sportsdb_event(match, sportsdb_events, aliases)
        if not sportsdb_match:
            home_keys = local_team_keys(match["homeTeam"], aliases)
            away_keys = local_team_keys(match["awayTeam"], aliases)
            print(f"    !! No TheSportsDB event match found for {match['id']}")
            print(f"       Local home keys: {home_keys}")
            print(f"       Local away keys: {away_keys}")
            continue

        event, is_reversed = sportsdb_match
        print(f"    Matched TheSportsDB event:")
        print(f"      event: {event.get('strEvent', 'N/A')}")
        print(f"      homeTeam: {event.get('strHomeTeam', 'N/A')}")
        print(f"      awayTeam: {event.get('strAwayTeam', 'N/A')}")
        print(f"      status: {event.get('strStatus', 'N/A')}")
        print(f"      timestamp: {event.get('strTimestamp') or event.get('dateEvent') or 'N/A'}")
        print(f"      score: {event.get('intHomeScore', '')}-{event.get('intAwayScore', '')}")
        if is_reversed:
            print("      note: TheSportsDB home/away order is reversed; scores will be mapped to the CSV home/away order.")

        home_score, away_score = sportsdb_scores(event, is_reversed)
        if home_score is None or away_score is None:
            print(f"    -> {match['id']} has no football-data.org score and no TheSportsDB score yet.")
            continue
        row = existing or {"matchId": match["id"]}
        row.update(
            {
                "matchId": match["id"],
                "status": "FINAL",
                "homeScore": str(home_score),
                "awayScore": str(away_score),
                "result": result_code_from_scores(home_score, away_score),
                "source": "thesportsdb.com",
                "updatedAt": now.isoformat(timespec="seconds"),
            }
        )
        result_by_match[match["id"]] = row
        updated += 1
        print(f"Updated {match['id']} from TheSportsDB: {home_score}-{away_score}")

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
