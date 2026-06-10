# Credit Divisions World Cup Leaderboard

Website leaderboard statis untuk kompetisi prediksi hasil pertandingan World Cup 2026. Website ini dibuat dengan HTML, CSS, dan vanilla JavaScript, sehingga bisa langsung dites di Chrome tanpa server lokal.

## Mulai Cepat

1. Buka folder proyek:

   ```bash
   cd worldcup-leaderboard-website
   ```

2. Buka file ini di Chrome:

   ```text
   site/index.html
   ```

3. Untuk rebuild data browser setelah mengubah CSV:

   ```bash
   python scripts/validate_data.py
   python scripts/test_scoring.py
   python scripts/build_site_data.py
   ```

4. Refresh Chrome.

## Struktur Folder

```text
worldcup-leaderboard-website/
  site/                         Website statis
    index.html
    styles.css
    app.js
    data/site-data.js           Data browser hasil build dari CSV
  data/                         Data yang bisa diedit admin
    matches.csv
    participants.csv
    predictions.csv
    results.csv
    team_aliases.csv
  scripts/                      Script validasi, build, dan update hasil
  docs/                         Tutorial lengkap
  .github/workflows/            GitHub Actions
  .github/codex/prompts/        Prompt Codex review
```

## Indeks Dokumentasi

- [Tes lokal di Chrome](docs/01-local-testing.md)
- [Panduan isi CSV dari kertas peserta](docs/02-csv-data-guide.md)
- [Script update data dan hasil pertandingan](docs/03-scripts-and-result-update.md)
- [Deploy ke GitHub Pages](docs/04-github-pages-deployment.md)
- [GitHub Actions workflow](docs/05-github-workflows.md)
- [Codex Agent dan Codex Cloud Review](docs/06-codex-agent.md)
- [Streaming opsional ke YouTube](docs/07-optional-youtube-streaming.md)
- [Checklist operasional turnamen](docs/08-tournament-operations.md)

## Aturan Skor

- `W`: Tim Nasional 1 menang.
- `L`: Tim Nasional 1 kalah.
- `D`: seri.
- Setiap prediksi benar mendapat 1 poin.
- Pertandingan `PENDING`, `LIVE`, `POSTPONED`, atau `CANCELLED` tidak dihitung ke skor.
- Tie-breaker: poin, akurasi, lalu nama peserta A-Z.

## Catatan Data Demo

Data awal berisi peserta dan beberapa hasil demo supaya tampilan bisa langsung dites. Sebelum kompetisi asli dimulai, ganti isi:

- `data/participants.csv`
- `data/predictions.csv`
- `data/results.csv`

Setelah mengubah CSV, jalankan:

```bash
python scripts/validate_data.py
python scripts/test_scoring.py
python scripts/build_site_data.py
```
