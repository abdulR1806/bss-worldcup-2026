# Deploy Ke GitHub Pages

Website ini bisa langsung dipublish ke GitHub Pages karena semua file statis ada di folder `site/`.

## Opsi Struktur Repository

Paling sederhana:

1. Jadikan folder `worldcup-leaderboard-website` sebagai isi repository GitHub.
2. Push semua file ke branch `main`.
3. Di GitHub, buka `Settings > Pages`.
4. Pilih:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/site`
5. Klik `Save`.

URL akan menjadi:

```text
https://USERNAME.github.io/REPOSITORY_NAME/
```

## Deploy Dari Workspace Ini

Jika folder ini berada di dalam repository yang lebih besar, ada dua pilihan:

- Pindahkan isi `worldcup-leaderboard-website/` ke repository baru.
- Atur GitHub Pages ke folder yang sesuai setelah push.

Untuk proyek sederhana, repository terpisah lebih mudah.

## Checklist Sebelum Deploy

Jalankan:

```bash
python scripts/validate_data.py
python scripts/test_scoring.py
python scripts/build_site_data.py
```

Pastikan file ini ikut ter-commit:

```text
site/index.html
site/styles.css
site/app.js
site/data/site-data.js
data/*.csv
scripts/*.py
```

## Update Website Setelah Edit CSV

1. Edit CSV di folder `data/`.
2. Jalankan:

   ```bash
   python scripts/validate_data.py
   python scripts/build_site_data.py
   ```

3. Commit perubahan:

   ```bash
   git add data site/data/site-data.js
   git commit -m "Update leaderboard data"
   git push
   ```

4. GitHub Pages akan memperbarui website otomatis.

## Catatan Penting

- Jangan taruh API key di `site/app.js` atau `site/data/site-data.js`.
- API key hanya boleh berada di GitHub Secrets.
- GitHub Pages hanya untuk menampilkan website, bukan untuk menjalankan update hasil pertandingan.
