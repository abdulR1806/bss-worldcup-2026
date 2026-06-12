from __future__ import annotations

from update_results import find_sportsdb_event, result_code_from_scores, sportsdb_scores


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


def main() -> None:
    test_sportsdb_matches_current_csv_home_away_order()
    test_sportsdb_reversed_event_maps_scores_to_csv_order()
    test_sportsdb_chooses_closest_event_when_teams_repeat()
    print("OK: update results fallback tests passed.")


if __name__ == "__main__":
    main()
