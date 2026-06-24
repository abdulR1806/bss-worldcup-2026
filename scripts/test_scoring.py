from __future__ import annotations

import csv
from pathlib import Path


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def first_present(row: dict[str, str], candidates: list[str]) -> str:
    normalized = {key.strip().lower(): value for key, value in row.items()}
    for candidate in candidates:
        value = normalized.get(candidate.strip().lower())
        if value is not None:
            return value.strip()
    return ""


def read_official_standings(root: Path) -> list[dict[str, object]]:
    rows = []
    for row in read_csv(root / "data" / "standings.csv"):
        participant_id = first_present(row, ["participantId", "Id participant", "id"])
        display_name = first_present(row, ["displayName", "nama participan", "nama participant", "nama peserta"])
        total = first_present(row, ["total", "skor pertandingan selesai", "points"])
        assert participant_id, "Each official standing row must have participant id."
        assert total.isdigit(), f"Official total for {participant_id} must be numeric."
        rows.append({"id": participant_id, "displayName": display_name, "points": int(total)})
    return rows


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    participants = read_csv(root / "data" / "participants.csv")
    standings = read_official_standings(root)

    participant_ids = {row["id"] for row in participants}
    standing_ids = [row["id"] for row in standings]

    assert standings, "Official standings should not be empty."
    assert set(standing_ids) == participant_ids, "Official standings must include exactly every participant."
    assert len(standing_ids) == len(set(standing_ids)), "Official standings must not duplicate participants."
    assert standings == sorted(
        standings,
        key=lambda row: (-int(row["points"]), str(row["displayName"])),
    ), "Official standings sort order changed."

    print("OK: official Google Sheet scoring CSV test passed.")


if __name__ == "__main__":
    main()
