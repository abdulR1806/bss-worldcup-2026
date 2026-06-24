# GitHub Actions Workflow

Folder `.github/workflows/` berisi automation untuk validasi dan update hasil.

## 1. CI Validasi Data

File:

```text
.github/workflows/ci.yml
```

Berjalan saat:

- push
- pull request
- manual dispatch

Yang dicek:

- CSV valid.
- Jumlah pertandingan 72.
- Setiap peserta punya 72 prediksi.
- Skor W/L/D benar.
- `site/data/site-data.js` bisa dibuild.

## 2. Update Hasil Otomatis

File:

```text
.github/workflows/update-results.yml
```

Berjalan:

- setiap jam
- manual dispatch

Workflow ini:

1. Menjalankan `scripts/update_results.py`.
2. Mendownload klasemen resmi Google Sheet SKOR ke `data/standings.csv` jika `OFFICIAL_SCORE_SHEET_CSV_URL` atau `OFFICIAL_SCORE_SHEET_URL` tersedia.
3. Memvalidasi CSV.
4. Menjalankan test scoring.
5. Membuild `site/data/site-data.js`.
6. Commit hasil jika ada perubahan.

## 3. Sinkronisasi Skor Final

File:

```text
.github/workflows/sync-final-scores.yml
```

Berjalan:

- setiap 6 jam pada menit `:37` UTC
- manual dispatch

Workflow ini menjalankan `scripts/update_results.py --sync-final-scores` untuk mengecek ulang semua baris `FINAL` di `data/results.csv` terhadap skor final dari API. Jika skor CSV berbeda dari skor API terbaru, baris hasil diperbarui, `site/data/site-data.js` dibuild ulang, lalu perubahan data dicommit.

## 4. Deploy GitHub Pages

File:

```text
.github/workflows/deploy.yml
```

Berjalan saat:

- push ke `main`
- workflow `Clean demo preview data` selesai sukses
- workflow `Update match results` selesai sukses
- workflow `Sync final match scores` selesai sukses
- manual dispatch

Catatan:

- Deploy ini sengaja ikut `workflow_run` supaya commit otomatis dari workflow data-update tetap memicu publish ke GitHub Pages.
- Jika workflow data gagal, deploy tidak jalan.

## Secret Yang Perlu Dibuat

Buka GitHub repository:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Buat:

| Secret | Isi |
| --- | --- |
| `FOOTBALL_DATA_TOKEN` | API token dari football-data.org |
| `FOOTBALL_DATA_COMPETITION_CODE` | Kode competition World Cup, default `WC` |
| `FOOTBALL_DATA_SEASON` | Season World Cup, default `2026` |
| `THESPORTSDB_API_KEY` | API key TheSportsDB untuk fallback, default workflow memakai public test key `123` jika secret tidak ada |
| `OFFICIAL_SCORE_SHEET_CSV_URL` | URL export CSV sheet `SKOR` untuk update otomatis `data/standings.csv` |
| `OFFICIAL_SCORE_SHEET_URL` | URL share Google Sheet untuk link UI dan fallback konversi CSV |
| `OFFICIAL_SCORE_SHEET_EMBED_URL` | URL publish/embed Google Sheet untuk iframe UI |

## Mengubah Jadwal Update

Saat ini workflow berjalan setiap jam:

```yaml
- cron: "13 * * * *"
```

Jika ingin setiap 2 jam:

```yaml
- cron: "13 */2 * * *"
```

GitHub Actions memakai UTC, bukan WIB.

Jam `:13` dipilih supaya tidak numpuk di top-of-hour, yang biasanya lebih sering terlambat di GitHub Actions.

## Menjalankan Manual

1. Buka tab `Actions`.
2. Pilih workflow `Update match results`.
3. Klik `Run workflow`.

## Jika Workflow Gagal

Cek urutan ini:

1. Buka log error di tab `Actions`.
2. Jika error CSV, jalankan lokal:

   ```bash
   python scripts/validate_data.py
   ```

3. Jika error API, cek secret dan `data/team_aliases.csv`.
4. Jika error commit, cek permission workflow `contents: write`.
