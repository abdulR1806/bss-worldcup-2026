from __future__ import annotations

import csv
from pathlib import Path


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    results_path = root / "data" / "results.csv"

    if not results_path.exists():
        print(f"Error: {results_path} does not exist.")
        return

    rows = read_csv(results_path)
    cleaned_count = 0

    for row in rows:
        if row.get("source") == "Demo preview data":
            row.update({
                "status": "PENDING",
                "homeScore": "",
                "awayScore": "",
                "result": "",
                "source": "",
                "updatedAt": "",
            })
            cleaned_count += 1

    if cleaned_count > 0:
        write_csv(
            results_path,
            rows,
            ["matchId", "status", "homeScore", "awayScore", "result", "source", "updatedAt"],
        )
        print(f"Successfully cleaned {cleaned_count} demo preview data rows in results.csv.")
    else:
        print("No demo preview data rows found to clean.")


if __name__ == "__main__":
    main()
