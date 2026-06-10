# Script Update Data Dan Hasil Pertandingan

Semua script dijalankan dari folder `worldcup-leaderboard-website`.

## Validasi Data

```bash
python scripts/validate_data.py
```

Validasi mengecek:

- Jumlah pertandingan harus 72.
- Semua peserta punya 72 prediksi.
- Prediksi hanya boleh `W`, `L`, atau `D`.
- Tidak ada duplikat prediksi.
- Hasil final harus punya result `W`, `L`, atau `D`.

## Test Skor

```bash
python scripts/test_scoring.py
```

Script ini memastikan:

- 1 prediksi benar = 1 poin.
- Akurasi berada di rentang 0-100%.
- Urutan leaderboard sesuai tie-breaker.

## Build Data Website

```bash
python scripts/build_site_data.py
```

Script ini membaca CSV dari folder `data/` lalu membuat:

```text
site/data/site-data.js
```

Website memakai file `.js` ini supaya bisa dibuka langsung dari `file://` di Chrome.

## Export Jadwal Dari Excel

Jika file template Excel berubah, jalankan:

```bash
python scripts/export_matches.py
```

Default script membaca:

```text
../Jadwal_FIFA_World_Cup_2026.xlsx
```

Hasilnya menulis ulang:

```text
data/matches.csv
```

Script juga otomatis membuat `resultFetchAfterWib`, yaitu:

```text
kickoffWib + 100 menit
```

## Update Hasil Dari API

```bash
python scripts/update_results.py
```

Script ini menggunakan API-FOOTBALL jika environment variable tersedia:

```bash
API_FOOTBALL_KEY=isi_api_key
API_FOOTBALL_LEAGUE_ID=isi_league_id_world_cup
API_FOOTBALL_SEASON=2026
```

Di Windows PowerShell:

```powershell
$env:API_FOOTBALL_KEY="isi_api_key"
$env:API_FOOTBALL_LEAGUE_ID="isi_league_id_world_cup"
$env:API_FOOTBALL_SEASON="2026"
python scripts/update_results.py
```

## Aturan Fetch 100 Menit

Script hanya mencoba mengambil hasil jika:

- pertandingan belum `FINAL`, dan
- waktu sekarang sudah melewati `resultFetchAfterWib`.

Jika API belum menandai pertandingan sebagai final, hasil tidak diubah dan akan dicoba lagi pada run berikutnya.

## Mapping Nama Tim

Jika nama tim di API berbeda dengan template, edit:

```text
data/team_aliases.csv
```

Contoh:

```csv
templateTeam,apiTeam,notes
Amerika Serikat,USA,Nama API berbeda
Ceko,Czech Republic,Nama API berbeda
```

## Dry Run

Untuk tes tanpa menulis CSV:

```bash
python scripts/update_results.py --dry-run
```

## Manual Override

Jika API salah atau telat, admin boleh mengedit `data/results.csv` manual. Setelah itu jalankan:

```bash
python scripts/validate_data.py
python scripts/build_site_data.py
```
