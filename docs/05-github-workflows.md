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
2. Memvalidasi CSV.
3. Menjalankan test scoring.
4. Membuild `site/data/site-data.js`.
5. Commit hasil jika ada perubahan.

## Secret Yang Perlu Dibuat

Buka GitHub repository:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Buat:

| Secret | Isi |
| --- | --- |
| `API_FOOTBALL_KEY` | API key dari API-FOOTBALL |
| `API_FOOTBALL_LEAGUE_ID` | ID league World Cup dari API provider |
| `OPENAI_API_KEY` | Hanya jika memakai Codex GitHub Action |

## Mengubah Jadwal Update

Saat ini workflow berjalan setiap jam:

```yaml
- cron: "0 * * * *"
```

Jika ingin setiap 2 jam:

```yaml
- cron: "0 */2 * * *"
```

GitHub Actions memakai UTC, bukan WIB.

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
