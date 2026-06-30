from __future__ import annotations

import argparse
import csv
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path


WIB = timezone(timedelta(hours=7))
SITE_DATA_PREFIX = "window.WORLD_CUP_LEADERBOARD_DATA = "
SITE_DATA_SUFFIX = ";\n"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def int_or_blank(value: str) -> int | str:
    value = str(value or "").strip()
    return int(value) if value else ""


def first_present(row: dict[str, str], candidates: list[str]) -> str:
    normalized = {key.strip().lower(): value for key, value in row.items()}
    for candidate in candidates:
        value = normalized.get(candidate.strip().lower())
        if value is not None:
            return value
    return ""


def read_standings(path: Path) -> list[dict[str, object]]:
    standings = []
    for row in read_csv(path):
        participant_id = first_present(row, ["participantId", "Id participant", "id"]).strip()
        display_name = first_present(row, ["displayName", "nama participan", "nama participant", "nama peserta"]).strip()
        score_as_is = first_present(row, ["scoreAsIs", "skor as is", "skor as is 2406"])
        total = first_present(row, ["total", "skor pertandingan selesai", "points"])

        if not participant_id:
            continue

        standings.append({
            "participantId": participant_id,
            "displayName": display_name,
            "scoreAsIs": int_or_blank(score_as_is),
            "points": int_or_blank(total),
        })
    return standings


def read_existing_metadata(root: Path) -> dict[str, object]:
    path = root / "site" / "data" / "site-data.js"
    if not path.exists():
        return {}

    content = path.read_text(encoding="utf-8")
    if not content.startswith(SITE_DATA_PREFIX):
        return {}

    json_payload = content[len(SITE_DATA_PREFIX):]
    if json_payload.endswith(SITE_DATA_SUFFIX):
        json_payload = json_payload[: -len(SITE_DATA_SUFFIX)]
    elif json_payload.endswith(";"):
        json_payload = json_payload[:-1]

    try:
        payload = json.loads(json_payload)
    except json.JSONDecodeError:
        metadata: dict[str, object] = {}
        for key in ("officialScoreSheetUrl", "officialScoreSheetEmbedUrl"):
            match = re.search(rf'"{key}"\s*:\s*"([^"]*)"', content)
            if match:
                metadata[key] = match.group(1)
        return metadata
    metadata = payload.get("metadata", {})
    return metadata if isinstance(metadata, dict) else {}


def build_payload(root: Path) -> dict:
    data_dir = root / "data"
    matches = read_csv(data_dir / "matches.csv")
    participants = read_csv(data_dir / "participants.csv")
    predictions = read_csv(data_dir / "predictions.csv")
    results = read_csv(data_dir / "results.csv")
    standings = read_standings(data_dir / "standings.csv")
    existing_metadata = read_existing_metadata(root)

    for match in matches:
        match["matchNo"] = int(match["matchNo"])

    for result in results:
        result["homeScore"] = int_or_blank(result.get("homeScore", ""))
        result["awayScore"] = int_or_blank(result.get("awayScore", ""))
        result["homePenaltyScore"] = int_or_blank(result.get("homePenaltyScore", ""))
        result["awayPenaltyScore"] = int_or_blank(result.get("awayPenaltyScore", ""))

    official_score_sheet_url = (
        os.environ.get("OFFICIAL_SCORE_SHEET_URL", "")
        or str(existing_metadata.get("officialScoreSheetUrl", ""))
    )
    official_score_sheet_embed_url = (
        os.environ.get("OFFICIAL_SCORE_SHEET_EMBED_URL", "")
        or str(existing_metadata.get("officialScoreSheetEmbedUrl", ""))
        or official_score_sheet_url
    )

    return {
        "metadata": {
            "title": "Credit Divisions World Cup Leaderboard",
            "dataMode": "Klasemen resmi dari ekspor CSV Google Sheet panitia; data pertandingan lokal hanya sebagai referensi.",
            "sourceWorkbook": "Google Sheet SKOR panitia",
            "officialScoreSheetUrl": official_score_sheet_url,
            "officialScoreSheetEmbedUrl": official_score_sheet_embed_url,
            "generatedAt": datetime.now(WIB).isoformat(timespec="seconds"),
            "timezone": "Asia/Jakarta",
            "resultDelayMinutes": 100,
            "scoring": "Klasemen memakai total resmi dari sheet SKOR panitia. Perhitungan W/L/D lama tidak lagi dipakai untuk menentukan peringkat.",
        },
        "matches": matches,
        "participants": participants,
        "predictions": predictions,
        "results": results,
        "standings": standings,
    }


def write_site_data(root: Path) -> Path:
    payload = build_payload(root)
    target = root / "site" / "data" / "site-data.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        SITE_DATA_PREFIX
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + SITE_DATA_SUFFIX,
        encoding="utf-8",
    )
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description="Build browser data for the static leaderboard.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    target = write_site_data(root)
    print(f"Wrote {target}")


if __name__ == "__main__":
    main()
