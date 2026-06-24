from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen


GOOGLE_SHEET_ID_PATTERN = re.compile(r"/spreadsheets/d/([^/]+)")


def load_local_env(root: Path) -> None:
    env_path = root / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def google_sheet_csv_url(url: str) -> str:
    parsed = urlparse(url.strip())
    match = GOOGLE_SHEET_ID_PATTERN.search(parsed.path)
    if not match:
        return url

    sheet_id = match.group(1)
    query = parse_qs(parsed.query)
    gid = query.get("gid", [""])[0]
    params = {"format": "csv"}
    if gid:
        params["gid"] = gid

    return urlunparse((
        parsed.scheme or "https",
        parsed.netloc or "docs.google.com",
        f"/spreadsheets/d/{sheet_id}/export",
        "",
        urlencode(params),
        "",
    ))


def download_csv(url: str, timeout: int) -> str:
    request = Request(url, headers={"User-Agent": "bss-worldcup-2026-score-sync/1.0"})
    with urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset)


def sort_standings_csv(content: str) -> str:
    """Re-sort the downloaded standings CSV by descending total then ascending name.

    The Google Sheet may list rows in any order. test_scoring.py asserts that
    data/standings.csv is sorted by (-points, displayName) so we normalise the
    order here before writing to disk.
    """
    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        return content
    fieldnames = list(reader.fieldnames)
    rows = list(reader)

    # Determine which column holds the display name and the total.
    name_col = next(
        (f for f in fieldnames if f.strip().lower() in ("nama participan", "displayname", "nama participant", "nama peserta")),
        fieldnames[1] if len(fieldnames) > 1 else "",
    )
    total_col = next(
        (f for f in fieldnames if f.strip().lower() in ("total", "points", "skor pertandingan selesai")),
        fieldnames[-1] if fieldnames else "",
    )

    def sort_key(row: dict) -> tuple:
        try:
            pts = -int(row.get(total_col, "0").strip() or "0")
        except ValueError:
            pts = 0
        return (pts, str(row.get(name_col, "")).strip())

    rows.sort(key=sort_key)

    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=fieldnames, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description="Download official standings CSV from a public Google Sheet.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument("--target", default="data/standings.csv", help="Target CSV path relative to root.")
    parser.add_argument("--timeout", type=int, default=30, help="Download timeout in seconds.")
    parser.add_argument("--required", action="store_true", help="Fail if no Google Sheet CSV URL is configured.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    load_local_env(root)

    raw_url = (
        os.getenv("OFFICIAL_SCORE_SHEET_CSV_URL", "").strip()
        or os.getenv("OFFICIAL_SCORE_SHEET_URL", "").strip()
    )

    if not raw_url:
        message = "OFFICIAL_SCORE_SHEET_CSV_URL/OFFICIAL_SCORE_SHEET_URL is not configured; keeping existing data/standings.csv."
        if args.required:
            print(f"ERROR: {message}", file=sys.stderr)
            raise SystemExit(1)
        print(f"WARNING: {message}")
        return

    csv_url = google_sheet_csv_url(raw_url)
    content = download_csv(csv_url, args.timeout)
    if not content.strip():
        raise SystemExit("Downloaded standings CSV is empty.")

    content = sort_standings_csv(content)

    target = root / args.target
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    print(f"Downloaded and sorted official standings CSV to {target}")


if __name__ == "__main__":
    main()
