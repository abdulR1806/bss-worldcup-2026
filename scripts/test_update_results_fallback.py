from __future__ import annotations

from update_results import (
    parse_iso,
    api_team_keys,
    find_match,
    find_sportsdb_event,
    result_fetch_wait_minutes,
    result_fetch_window_is_open,
    result_code_from_scores,
    result_row_matches_score,
    result_row_score,
    sportsdb_scores,
    update_result_row,
)


def test_football_data_team_keys_ignore_null_placeholders() -> None:
    assert api_team_keys({"id": 1234, "name": None, "shortName": None, "tla": None}) == set()
    assert api_team_keys(None) == set()


def test_football_data_match_lookup_skips_unresolved_api_teams() -> None:
    match = {"homeTeam": "Meksiko", "awayTeam": "Afrika Selatan"}
    aliases = {"meksiko": {"mexico"}, "afrika selatan": {"south africa"}}
    fixtures = [
        {
            "homeTeam": {"id": 1, "name": None, "shortName": None, "tla": None},
            "awayTeam": {"id": 2, "name": None, "shortName": None, "tla": None},
        },
        {
            "homeTeam": {"name": "Mexico", "shortName": "Mexico", "tla": "MEX"},
            "awayTeam": {"name": "South Africa", "shortName": "South Africa", "tla": "RSA"},
        },
    ]

    assert find_match(match, fixtures, aliases) is fixtures[1]


def test_sportsdb_matches_current_csv_home_away_order() -> None:
    match = {
        "homeTeam": "Amerika Serikat",
        "awayTeam": "Paraguay",
        "kickoffWib": "2026-06-13T08:00:00+07:00",
    }
    aliases = {
        "amerika serikat": {"united states", "usa"},
        "paraguay": {"paraguay"},
    }
    events = [
        {
            "strHomeTeam": "United States",
            "strAwayTeam": "Paraguay",
            "strTimestamp": "2026-06-13T01:00:00+00:00",
            "intHomeScore": "2",
            "intAwayScore": "1",
        }
    ]

    event_match = find_sportsdb_event(match, events, aliases)

    assert event_match is not None
    event, is_reversed = event_match
    assert event is events[0]
    assert is_reversed is False
    assert sportsdb_scores(event, is_reversed) == (2, 1)
    assert result_code_from_scores(2, 1) == "W"


def test_sportsdb_reversed_event_maps_scores_to_csv_order() -> None:
    match = {
        "homeTeam": "Amerika Serikat",
        "awayTeam": "Paraguay",
        "kickoffWib": "2026-06-13T08:00:00+07:00",
    }
    aliases = {
        "amerika serikat": {"united states", "usa"},
        "paraguay": {"paraguay"},
    }
    event = {
        "strHomeTeam": "Paraguay",
        "strAwayTeam": "USA",
        "strTimestamp": "2026-06-13T01:00:00+00:00",
        "intHomeScore": "1",
        "intAwayScore": "3",
    }

    event_match = find_sportsdb_event(match, [event], aliases)

    assert event_match is not None
    matched_event, is_reversed = event_match
    assert matched_event is event
    assert is_reversed is True
    assert sportsdb_scores(matched_event, is_reversed) == (3, 1)
    assert result_code_from_scores(3, 1) == "W"


def test_sportsdb_chooses_closest_event_when_teams_repeat() -> None:
    match = {
        "homeTeam": "Meksiko",
        "awayTeam": "Afrika Selatan",
        "kickoffWib": "2026-06-12T02:00:00+07:00",
    }
    aliases = {
        "meksiko": {"mexico"},
        "afrika selatan": {"south africa"},
    }
    wrong_date_event = {
        "strHomeTeam": "Mexico",
        "strAwayTeam": "South Africa",
        "strTimestamp": "2026-07-12T19:00:00+00:00",
        "intHomeScore": "0",
        "intAwayScore": "1",
    }
    correct_date_event = {
        "strHomeTeam": "Mexico",
        "strAwayTeam": "South Africa",
        "strTimestamp": "2026-06-11T19:00:00+00:00",
        "intHomeScore": "2",
        "intAwayScore": "0",
    }

    event_match = find_sportsdb_event(match, [wrong_date_event, correct_date_event], aliases)

    assert event_match is not None
    event, is_reversed = event_match
    assert event is correct_date_event
    assert is_reversed is False
    assert sportsdb_scores(event, is_reversed) == (2, 0)


def test_final_score_comparison_helpers_detect_differences() -> None:
    row = {
        "matchId": "M001",
        "status": "FINAL",
        "homeScore": "2",
        "awayScore": "0",
        "result": "W",
        "source": "manual",
        "updatedAt": "old",
    }

    assert result_row_score(row) == (2, 0)
    assert result_row_matches_score(row, 2, 0) is True
    assert result_row_matches_score(row, 1, 1) is False

    update_result_row(row, "M001", 1, 1, "football-data.org", "2026-06-16T12:00:00+07:00")

    assert row == {
        "matchId": "M001",
        "status": "FINAL",
        "homeScore": "1",
        "awayScore": "1",
        "homePenaltyScore": "",
        "awayPenaltyScore": "",
        "result": "D",
        "source": "football-data.org",
        "updatedAt": "2026-06-16T12:00:00+07:00",
    }


def test_result_fetch_window_opens_after_configured_wib_time() -> None:
    now = parse_iso("2026-07-01T06:22:00+07:00")
    fetch_after = parse_iso("2026-07-01T01:40:00+07:00")

    assert result_fetch_window_is_open(now, fetch_after) is True


def test_result_fetch_window_reports_wait_minutes_before_open_time() -> None:
    now = parse_iso("2026-07-01T06:22:00+07:00")
    fetch_after = parse_iso("2026-07-01T06:40:00+07:00")

    assert result_fetch_window_is_open(now, fetch_after) is False
    assert result_fetch_wait_minutes(now, fetch_after) == 18


def main() -> None:
    test_football_data_team_keys_ignore_null_placeholders()
    test_football_data_match_lookup_skips_unresolved_api_teams()
    test_sportsdb_matches_current_csv_home_away_order()
    test_sportsdb_reversed_event_maps_scores_to_csv_order()
    test_sportsdb_chooses_closest_event_when_teams_repeat()
    test_final_score_comparison_helpers_detect_differences()
    test_result_fetch_window_opens_after_configured_wib_time()
    test_result_fetch_window_reports_wait_minutes_before_open_time()
    print("OK: update results fallback tests passed.")


if __name__ == "__main__":
    main()
