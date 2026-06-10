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

Script update hasil memakai football-data.org dengan endpoint:

```text
https://api.football-data.org/v4/competitions/WC/matches?season=2026
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

Script ini menggunakan football-data.org jika environment variable tersedia:

```bash
FOOTBALL_DATA_TOKEN=isi_api_token
FOOTBALL_DATA_COMPETITION_CODE=WC
FOOTBALL_DATA_SEASON=2026
```

Di Windows PowerShell:

```powershell
$env:FOOTBALL_DATA_TOKEN="isi_api_token"
$env:FOOTBALL_DATA_COMPETITION_CODE="WC"
$env:FOOTBALL_DATA_SEASON="2026"
python scripts/update_results.py
```

Jika memakai file `.env`, tidak perlu set `$env:` manual; script akan membaca `.env` dari project root.

## Aturan Fetch 100 Menit

Script hanya mencoba mengambil hasil jika:

- pertandingan belum `FINAL`, dan
- waktu sekarang sudah melewati `resultFetchAfterWib`.

Jika API belum menandai pertandingan sebagai final, hasil tidak diubah dan akan dicoba lagi pada run berikutnya.

Untuk menghindari masalah beda tanggal UTC dan WIB, script mengambil daftar match World Cup 2026 lalu mencocokkan nama tim terhadap `data/matches.csv`. API baru dipanggil saat ada minimal satu pertandingan yang sudah melewati `resultFetchAfterWib`. Response headers dipakai untuk memantau sisa request dan waktu reset quota.

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
