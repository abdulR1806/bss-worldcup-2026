from __future__ import annotations

import csv
import json
import os
import tempfile
from pathlib import Path

from build_site_data import build_payload, write_site_data


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def fixture_root() -> Path:
    root = Path(tempfile.mkdtemp())
    data_dir = root / "data"
    write_csv(
        data_dir / "matches.csv",
        ["id", "matchNo", "kickoffWib", "resultFetchAfterWib", "group", "homeTeam", "awayTeam", "location"],
        [
            {
                "id": "M001",
                "matchNo": "1",
                "kickoffWib": "2026-06-12T02:00:00+07:00",
                "resultFetchAfterWib": "2026-06-12T03:40:00+07:00",
                "group": "A",
                "homeTeam": "Meksiko",
                "awayTeam": "Afrika Selatan",
                "location": "Mexico City",
            }
        ],
    )
    write_csv(
        data_dir / "participants.csv",
        ["id", "displayName", "division", "badge"],
        [{"id": "P001", "displayName": "Peserta 1", "division": "Credit", "badge": "P1"}],
    )
    write_csv(
        data_dir / "predictions.csv",
        ["participantId", "matchId", "prediction"],
        [{"participantId": "P001", "matchId": "M001", "prediction": "W"}],
    )
    write_csv(
        data_dir / "results.csv",
        ["matchId", "status", "homeScore", "awayScore", "homePenaltyScore", "awayPenaltyScore", "result", "source", "updatedAt"],
        [{"matchId": "M001", "status": "PENDING", "homeScore": "", "awayScore": "", "homePenaltyScore": "", "awayPenaltyScore": "", "result": "", "source": "", "updatedAt": ""}],
    )
    write_csv(
        data_dir / "standings.csv",
        ["Id participant", "nama participan", "total"],
        [{"Id participant": "P001", "nama participan": "Peserta 1", "total": "0"}],
    )
    return root


def test_preserves_existing_official_sheet_metadata_when_env_is_empty() -> None:
    root = fixture_root()
    os.environ.pop("OFFICIAL_SCORE_SHEET_URL", None)
    os.environ.pop("OFFICIAL_SCORE_SHEET_EMBED_URL", None)

    first_payload = build_payload(root)
    first_payload["metadata"]["officialScoreSheetUrl"] = "https://docs.google.com/spreadsheets/d/example/edit"
    first_payload["metadata"]["officialScoreSheetEmbedUrl"] = "https://docs.google.com/spreadsheets/d/e/example/pubhtml"
    target = root / "site" / "data" / "site-data.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "window.WORLD_CUP_LEADERBOARD_DATA = "
        + json.dumps(first_payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    write_site_data(root)
    payload = build_payload(root)

    assert payload["metadata"]["officialScoreSheetUrl"] == "https://docs.google.com/spreadsheets/d/example/edit"
    assert payload["metadata"]["officialScoreSheetEmbedUrl"] == "https://docs.google.com/spreadsheets/d/e/example/pubhtml"


def test_recovers_official_sheet_metadata_from_malformed_existing_data() -> None:
    root = fixture_root()
    os.environ.pop("OFFICIAL_SCORE_SHEET_URL", None)
    os.environ.pop("OFFICIAL_SCORE_SHEET_EMBED_URL", None)
    target = root / "site" / "data" / "site-data.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        """window.WORLD_CUP_LEADERBOARD_DATA = {
  "metadata": {
    "officialScoreSheetUrl": "https://docs.google.com/spreadsheets/d/example/edit",
    "officialScoreSheetEmbedUrl": "https://docs.google.com/spreadsheets/d/e/example/pubhtml"
    "generatedAt": "2026-06-30T15:25:10+07:00"
  }
};
""",
        encoding="utf-8",
    )

    write_site_data(root)
    payload = build_payload(root)

    assert payload["metadata"]["officialScoreSheetUrl"] == "https://docs.google.com/spreadsheets/d/example/edit"
    assert payload["metadata"]["officialScoreSheetEmbedUrl"] == "https://docs.google.com/spreadsheets/d/e/example/pubhtml"


def main() -> None:
    test_preserves_existing_official_sheet_metadata_when_env_is_empty()
    test_recovers_official_sheet_metadata_from_malformed_existing_data()
    print("OK: build site data metadata tests passed.")


if __name__ == "__main__":
    main()
