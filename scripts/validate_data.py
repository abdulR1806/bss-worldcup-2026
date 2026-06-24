from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from pathlib import Path


VALID_PREDICTIONS = {"W", "L", "D"}
VALID_RESULT_STATUS = {"PENDING", "LIVE", "FINAL", "POSTPONED", "CANCELLED"}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def require_columns(path: Path, rows: list[dict[str, str]], columns: list[str], errors: list[str]) -> None:
    if not rows:
        errors.append(f"{path} has no data rows.")
        return
    missing = [column for column in columns if column not in rows[0]]
    if missing:
        errors.append(f"{path} is missing columns: {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate World Cup leaderboard CSV data.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    data_dir = root / "data"
    errors: list[str] = []

    matches = read_csv(data_dir / "matches.csv")
    participants = read_csv(data_dir / "participants.csv")
    predictions = read_csv(data_dir / "predictions.csv")
    results = read_csv(data_dir / "results.csv")
    standings = read_csv(data_dir / "standings.csv")

    require_columns(data_dir / "matches.csv", matches, ["id", "matchNo", "kickoffWib", "resultFetchAfterWib", "group", "homeTeam", "awayTeam", "location"], errors)
    require_columns(data_dir / "participants.csv", participants, ["id", "displayName", "division", "badge"], errors)
    require_columns(data_dir / "predictions.csv", predictions, ["participantId", "matchId", "prediction"], errors)
    require_columns(data_dir / "results.csv", results, ["matchId", "status", "homeScore", "awayScore", "result", "source", "updatedAt"], errors)
    require_columns(data_dir / "standings.csv", standings, ["Id participant", "nama participan", "total"], errors)

    match_ids = {row["id"] for row in matches}
    participant_ids = {row["id"] for row in participants}

    if len(matches) != 72:
      errors.append(f"Expected 72 matches, found {len(matches)}.")

    if len(match_ids) != len(matches):
      errors.append("Duplicate match IDs found in data/matches.csv.")

    if len(participant_ids) != len(participants):
      errors.append("Duplicate participant IDs found in data/participants.csv.")

    for row in participants:
        if not row["id"].strip() or not row["displayName"].strip():
            errors.append("Each participant must have id and displayName.")

    standing_ids = [row.get("Id participant", "").strip() for row in standings]
    standing_id_set = set(standing_ids)
    if standing_id_set != participant_ids:
        errors.append("data/standings.csv must include exactly every participant from data/participants.csv.")
    if len(standing_ids) != len(standing_id_set):
        errors.append("Duplicate participant IDs found in data/standings.csv.")
    for row in standings:
        total = row.get("total", "").strip()
        if not total.isdigit():
            errors.append(f"Standing total for {row.get('Id participant', '<blank>')} must be numeric.")

    prediction_pairs = Counter((row["participantId"], row["matchId"]) for row in predictions)
    for pair, count in prediction_pairs.items():
        if count > 1:
            errors.append(f"Duplicate prediction row for participant/match: {pair[0]} / {pair[1]}")

    predictions_by_participant: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in predictions:
        participant_id = row["participantId"]
        match_id = row["matchId"]
        prediction = row["prediction"].strip().upper()

        if participant_id not in participant_ids:
            errors.append(f"Prediction references unknown participant: {participant_id}")
        if match_id not in match_ids:
            errors.append(f"Prediction references unknown match: {match_id}")
        if prediction not in VALID_PREDICTIONS:
            errors.append(f"Invalid prediction '{prediction}' for {participant_id} / {match_id}. Use W, L, or D.")

        predictions_by_participant[participant_id].append(row)

    for participant_id in participant_ids:
        count = len(predictions_by_participant[participant_id])
        if count != len(matches):
            errors.append(f"Participant {participant_id} has {count} predictions; expected {len(matches)}.")

    seen_result_matches = set()
    for row in results:
        match_id = row["matchId"]
        status = row["status"].strip().upper()
        result = row["result"].strip().upper()

        if match_id in seen_result_matches:
            errors.append(f"Duplicate result row for match: {match_id}")
        seen_result_matches.add(match_id)

        if match_id not in match_ids:
            errors.append(f"Result references unknown match: {match_id}")
        if status not in VALID_RESULT_STATUS:
            errors.append(f"Invalid result status '{status}' for {match_id}.")
        if status == "FINAL" and result not in VALID_PREDICTIONS:
            errors.append(f"Final result for {match_id} must be W, L, or D.")
        if status != "FINAL" and result:
            errors.append(f"Non-final result for {match_id} should leave result blank.")

    missing_result_rows = match_ids - seen_result_matches
    if missing_result_rows:
        errors.append(f"Missing result rows: {', '.join(sorted(missing_result_rows)[:10])}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        raise SystemExit(1)

    print(f"OK: {len(matches)} matches, {len(participants)} participants, {len(predictions)} predictions.")


if __name__ == "__main__":
    main()
