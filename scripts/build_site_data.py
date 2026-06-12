from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


WIB = timezone(timedelta(hours=7))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def int_or_blank(value: str) -> int | str:
    value = str(value or "").strip()
    return int(value) if value else ""


def build_payload(root: Path) -> dict:
    data_dir = root / "data"
    matches = read_csv(data_dir / "matches.csv")
    participants = read_csv(data_dir / "participants.csv")
    predictions = read_csv(data_dir / "predictions.csv")
    results = read_csv(data_dir / "results.csv")

    for match in matches:
        match["matchNo"] = int(match["matchNo"])

    for result in results:
        result["homeScore"] = int_or_blank(result.get("homeScore", ""))
        result["awayScore"] = int_or_blank(result.get("awayScore", ""))

    return {
        "metadata": {
            "title": "Credit Divisions World Cup Leaderboard",
            "dataMode": "Data utama dari football-data.org; fallback TheSportsDB jika skor kosong",
            "sourceWorkbook": "Jadwal_FIFA_World_Cup_2026.xlsx",
            "generatedAt": datetime.now(WIB).isoformat(timespec="seconds"),
            "timezone": "Asia/Jakarta",
            "resultDelayMinutes": 100,
            "scoring": "1 poin untuk setiap prediksi W/L/D yang benar. Pertandingan menunggu tidak dihitung.",
        },
        "matches": matches,
        "participants": participants,
        "predictions": predictions,
        "results": results,
    }


def write_site_data(root: Path) -> Path:
    payload = build_payload(root)
    target = root / "site" / "data" / "site-data.js"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "window.WORLD_CUP_LEADERBOARD_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
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
