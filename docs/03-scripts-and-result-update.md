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

Setiap build juga memperbarui `metadata.generatedAt` memakai waktu WIB. Nilai ini ditampilkan di website sebagai `Pembaruan terakhir`.

Jika repository memakai hook lokal `.githooks/pre-commit`, hook akan menjalankan `scripts/build_site_data.py` dan menambahkan `site/data/site-data.js` ke commit. Pastikan `core.hooksPath` sudah mengarah ke `.githooks` jika ingin perilaku ini aktif di mesin lokal.

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

Script update hasil memakai football-data.org sebagai sumber utama dengan endpoint:

```text
https://api.football-data.org/v4/competitions/WC/matches?season=2026
```

Jika football-data.org belum punya skor full-time yang bisa dipakai, script akan mencoba fallback TheSportsDB:

```text
https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026
```

### Setup API Key Lokal

Buat akun football-data.org, ambil API token dari dashboard, lalu buat file lokal `.env` dari `.env.example`:

```powershell
Copy-Item .env.example .env
```

Isi nilai ini di `.env`:

```text
FOOTBALL_DATA_TOKEN=isi_api_token
FOOTBALL_DATA_COMPETITION_CODE=WC
FOOTBALL_DATA_SEASON=2026
THESPORTSDB_API_KEY=123
THESPORTSDB_LEAGUE_ID=4429
```

Jangan commit file `.env`; file ini sudah masuk `.gitignore`.

### Cek Koneksi API

Jalankan cek read-only ini sebelum update hasil:

```bash
python scripts/check_football_data_connection.py
```

Script akan memanggil endpoint World Cup 2026, lalu menampilkan jumlah match yang dikembalikan dan header quota seperti `X-RequestsAvailable` serta `X-RequestCounter-Reset`.

```bash
python scripts/update_results.py
```

Script ini menggunakan football-data.org sebagai prioritas utama jika environment variable tersedia, lalu TheSportsDB sebagai fallback jika skor football-data.org masih kosong/belum final:

```bash
FOOTBALL_DATA_TOKEN=isi_api_token
FOOTBALL_DATA_COMPETITION_CODE=WC
FOOTBALL_DATA_SEASON=2026
THESPORTSDB_API_KEY=123
THESPORTSDB_LEAGUE_ID=4429
```

Di Windows PowerShell:

```powershell
$env:FOOTBALL_DATA_TOKEN="isi_api_token"
$env:FOOTBALL_DATA_COMPETITION_CODE="WC"
$env:FOOTBALL_DATA_SEASON="2026"
$env:THESPORTSDB_API_KEY="123"
$env:THESPORTSDB_LEAGUE_ID="4429"
python scripts/update_results.py
```

Jika memakai file `.env`, tidak perlu set `$env:` manual; script akan membaca `.env` dari project root.

Setiap pemanggilan non-dry-run `scripts/update_results.py` akan membuild ulang `site/data/site-data.js` setelah proses update selesai. Artinya label `Pembaruan terakhir` ikut berubah saat update API dijalankan, termasuk ketika tidak ada hasil baru yang masuk.

## Aturan Fetch 100 Menit

Script hanya mencoba mengambil hasil jika:

- pertandingan belum `FINAL`, dan
- waktu sekarang sudah melewati `resultFetchAfterWib`.

Jika football-data.org belum menandai pertandingan sebagai final atau skor full-time masih kosong, script akan mengecek TheSportsDB. TheSportsDB hanya dipakai saat football-data.org belum punya skor yang valid, sehingga skor football-data.org yang sudah valid tidak akan ditimpa oleh fallback. Jika kedua API belum punya skor, hasil tidak diubah dan akan dicoba lagi pada run berikutnya.

Untuk menghindari masalah beda tanggal UTC dan WIB, script mengambil daftar match World Cup 2026 lalu mencocokkan nama tim terhadap `data/matches.csv`. TheSportsDB juga dicocokkan dengan nama tim/alias dan memilih event dengan kickoff terdekat dari `kickoffWib`; jika urutan home/away TheSportsDB terbalik, skor dipetakan ulang ke urutan home/away CSV sebelum ditulis. API baru dipanggil saat ada minimal satu pertandingan yang sudah melewati `resultFetchAfterWib`. Response headers football-data.org dipakai untuk memantau sisa request dan waktu reset quota.

## Mapping Nama Tim

Jika nama tim di API berbeda dengan template, edit:

```text
data/team_aliases.csv
```

Contoh:

```csv
templateTeam,apiTeam,notes
Amerika Serikat,United States|USA,Nama API berbeda
Ceko,Czech Republic|Czechia,Nama API berbeda
```


## Diagnostik TheSportsDB

Untuk mengecek mapping TheSportsDB terhadap satu match CSV tanpa menulis file, jalankan:

```bash
python scripts/update_results.py --dry-run --diagnose-sportsdb-match-id M001
```

Output diagnostik menampilkan jumlah event dari TheSportsDB, alias home/away dari CSV, event yang terpilih, status, raw score TheSportsDB, apakah home/away perlu dibalik, skor yang sudah dipetakan ke urutan CSV, dan hasil `W`/`L`/`D`. GitHub Actions `Update match results` juga menjalankan diagnostik `M001`, menyimpan log `update-results.log` sebagai artifact, dan mencetak ringkasan konfigurasi/API tanpa membuka nilai token.

## Dry Run

Untuk tes tanpa menulis CSV:

```bash
python scripts/update_results.py --dry-run
```

Mode `--dry-run` tidak menulis CSV dan tidak memperbarui `site/data/site-data.js`.

## Manual Override

Jika API salah atau telat, admin boleh mengedit `data/results.csv` manual. Setelah itu jalankan:

```bash
python scripts/validate_data.py
python scripts/build_site_data.py
```
