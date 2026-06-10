from __future__ import annotations

import argparse
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path

import openpyxl


MONTHS = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "Mei": 5,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Agu": 8,
    "Aug": 8,
    "Sep": 9,
    "Okt": 10,
    "Oct": 10,
    "Nov": 11,
    "Des": 12,
    "Dec": 12,
}
WIB = timezone(timedelta(hours=7))


def parse_time_group(value: str) -> tuple[datetime, str]:
    date_part, time_part, group = [part.strip() for part in value.split(",")]
    day_text, month_text, year_text = date_part.split()
    hour_text, minute_text = time_part.split(":")
    kickoff = datetime(
        int(year_text),
        MONTHS[month_text],
        int(day_text),
        int(hour_text),
        int(minute_text),
        tzinfo=WIB,
    )
    return kickoff, group


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the 72 match template from Excel to data/matches.csv.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument("--workbook", default="../Jadwal_FIFA_World_Cup_2026.xlsx", help="Workbook path relative to project root.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    workbook_path = (root / args.workbook).resolve()
    workbook = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)
    sheet = workbook.active
    rows = []

    for row in sheet.iter_rows(min_row=2, values_only=True):
        number, waktu, home_team, _score, away_team, location = row[:6]
        if not number:
            continue
        kickoff, group = parse_time_group(str(waktu))
        match_id = f"M{int(number):03d}"
        rows.append(
            {
                "id": match_id,
                "matchNo": int(number),
                "kickoffText": str(waktu),
                "kickoffWib": kickoff.isoformat(),
                "resultFetchAfterWib": (kickoff + timedelta(minutes=100)).isoformat(),
                "group": group,
                "homeTeam": str(home_team),
                "awayTeam": str(away_team),
                "location": str(location),
            }
        )

    target = root / "data" / "matches.csv"
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "matchNo",
                "kickoffText",
                "kickoffWib",
                "resultFetchAfterWib",
                "group",
                "homeTeam",
                "awayTeam",
                "location",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} matches to {target}")


if __name__ == "__main__":
    main()
