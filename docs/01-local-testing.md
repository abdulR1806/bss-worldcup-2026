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

`scripts/build_site_data.py` juga memperbarui metadata `generatedAt`, sehingga label `Pembaruan terakhir` di website ikut berubah setelah data dibuild ulang.

## Verifikasi Dengan Playwright

Jika perlu mengecek tampilan secara otomatis, jalankan server statis lokal:

```bash
python -m http.server 8765 --directory site
```

Lalu di terminal lain jalankan:

```bash
venv\Scripts\python.exe scripts\verify_site_playwright.py
```

Script ini membuka:

```text
http://127.0.0.1:8765/index.html
```

Yang dicek:

- Teks utama dan data CSV tampil.
- Filter grup dan pencarian bisa dipakai.
- Navigasi desktop dan menu burger mobile/tablet bekerja.
- Tema gelap dan terang punya warna kartu/tabel yang berbeda.
- Kartu prediksi benar berwarna hijau dan prediksi salah berwarna merah.
- Status `Selesai` di Hasil pertandingan berwarna hijau.
- Logo cropped dari `site/assets/logo-cropped.png` berhasil dimuat.

Screenshot dibuat untuk viewport 375, 768, 1024, dan 1440 di folder:

```text
screenshots/
```

## Troubleshooting

- Jika halaman kosong, pastikan `site/data/site-data.js` ada.
- Jika angka skor tidak berubah, pastikan `scripts/build_site_data.py` sudah dijalankan setelah edit CSV.
- Jika browser menampilkan data lama, tekan `Ctrl + F5`.
- Jika search bar terlihat seperti ada kotak kecil di dalam input, pastikan CSS `.field-search input` tetap transparan dan verifikasi ulang dengan Playwright.
