# Tes Lokal Di Chrome

Website ini dirancang supaya bisa dites tanpa server.

## Langkah

1. Buka Windows Explorer.
2. Masuk ke folder:

   ```text
   worldcup-leaderboard-website/site/
   ```

3. Double-click `index.html`.
4. Chrome akan membuka dashboard leaderboard.

## Mode Normal

File yang dibuka:

```text
site/index.html
```

Mode ini menampilkan:

- Klasemen utama.
- Detail prediksi peserta.
- Hasil pertandingan.
- Filter grup.
- Filter hari pertandingan.
- Pencarian tim atau peserta.

## Mode Streaming Opsional

Tambahkan query ini di address bar:

```text
file:///.../worldcup-leaderboard-website/site/index.html?mode=stream
```

Mode ini menampilkan leaderboard besar yang lebih cocok untuk OBS atau layar TV.

## Setelah Mengubah CSV

Jalankan dari folder `worldcup-leaderboard-website`:

```bash
python scripts/validate_data.py
python scripts/test_scoring.py
python scripts/build_site_data.py
```

Lalu refresh Chrome.

## Troubleshooting

- Jika halaman kosong, pastikan `site/data/site-data.js` ada.
- Jika angka skor tidak berubah, pastikan `scripts/build_site_data.py` sudah dijalankan setelah edit CSV.
- Jika browser menampilkan data lama, tekan `Ctrl + F5`.
