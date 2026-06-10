# Checklist Operasional Turnamen

Gunakan checklist ini saat kompetisi berjalan.

## Sebelum Turnamen

- Cetak template prediksi peserta.
- Kumpulkan kertas prediksi.
- Isi `data/participants.csv`.
- Isi `data/predictions.csv`.
- Reset `data/results.csv` ke `PENDING` jika masih ada data demo.
- Jalankan:

  ```bash
  python scripts/validate_data.py
  python scripts/test_scoring.py
  python scripts/build_site_data.py
  ```

- Buka `site/index.html` di Chrome dan cek leaderboard.
- Deploy ke GitHub Pages.
- Aktifkan GitHub Actions.
- Simpan secret API jika memakai update otomatis.

## Setiap Hari Pertandingan

- Cek workflow `Update match results`.
- Jika API belum update, isi manual `data/results.csv`.
- Setelah edit manual, jalankan validasi dan build.
- Pastikan website menampilkan jumlah pertandingan selesai yang benar.

## Setelah Ada Pull Request

- Pastikan `Validate leaderboard data` sukses.
- Cek review Codex jika aktif.
- Jangan merge jika validasi CSV gagal.

## Jika Ada Protes Skor

1. Cari peserta di `data/participants.csv`.
2. Cek prediksi peserta di `data/predictions.csv`.
3. Cek hasil pertandingan di `data/results.csv`.
4. Jalankan:

   ```bash
   python scripts/test_scoring.py
   ```

5. Jika hasil pertandingan salah, update `data/results.csv`, rebuild, lalu commit.

## Setelah Turnamen

- Export data CSV sebagai arsip.
- Simpan versi final website.
- Matikan workflow update otomatis jika tidak diperlukan lagi.
- Matikan streaming jika berjalan di VPS.
