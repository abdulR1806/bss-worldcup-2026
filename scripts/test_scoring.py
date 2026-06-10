from __future__ import annotations

import csv
from pathlib import Path


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def calculate_standings(root: Path) -> list[dict[str, object]]:
    participants = read_csv(root / "data" / "participants.csv")
    predictions = read_csv(root / "data" / "predictions.csv")
    results = read_csv(root / "data" / "results.csv")
    final_results = {
        row["matchId"]: row["result"]
        for row in results
        if row["status"].upper() == "FINAL" and row["result"]
    }

    standings = []
    for participant in participants:
        participant_predictions = [row for row in predictions if row["participantId"] == participant["id"]]
        played = 0
        correct = 0
        for prediction in participant_predictions:
            result = final_results.get(prediction["matchId"])
            if not result:
                continue
            played += 1
            if prediction["prediction"] == result:
                correct += 1
        standings.append(
            {
                "id": participant["id"],
                "displayName": participant["displayName"],
                "points": correct,
                "correct": correct,
                "played": played,
                "accuracy": correct / played if played else 0,
            }
        )

    return sorted(
        standings,
        key=lambda row: (-int(row["points"]), -float(row["accuracy"]), str(row["displayName"])),
    )


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    standings = calculate_standings(root)

    assert standings, "Standings should not be empty."
    assert all(row["points"] == row["correct"] for row in standings), "1 correct prediction must equal 1 point."
    assert all(0 <= row["accuracy"] <= 1 for row in standings), "Accuracy must be between 0 and 1."
    assert standings == sorted(
        standings,
        key=lambda row: (-int(row["points"]), -float(row["accuracy"]), str(row["displayName"])),
    ), "Standings sort order changed."

    print("OK: scoring test passed.")


if __name__ == "__main__":
    main()
