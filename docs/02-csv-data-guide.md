# Panduan Isi CSV Dari Kertas Peserta

Data utama berada di folder `data/`. File CSV bisa diedit memakai Excel, Google Sheets, LibreOffice, atau text editor.

## File Yang Perlu Diisi

### `data/participants.csv`

Daftar peserta publik.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `id` | `P001` | ID unik peserta. Jangan diganti setelah dipakai di prediksi. |
| `displayName` | `Credit Alpha` | Nama yang tampil di website. |
| `division` | `Corporate Credit` | Divisi/unit peserta. |
| `badge` | `A` | Huruf singkat untuk avatar peserta. |

Contoh:

```csv
id,displayName,division,badge
P001,Credit Alpha,Corporate Credit,A
P002,Risk Rangers,Retail Credit,R
```

### `data/predictions.csv`

Isi prediksi setiap peserta untuk seluruh 72 pertandingan.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `participantId` | `P001` | Harus sama dengan `id` di `participants.csv`. |
| `matchId` | `M001` | Harus sama dengan `id` di `matches.csv`. |
| `prediction` | `W` | Pilihan prediksi: `W`, `L`, atau `D`. |

Arti prediksi:

- `W`: Tim Nasional 1 menang.
- `L`: Tim Nasional 1 kalah.
- `D`: seri.

Contoh:

```csv
participantId,matchId,prediction
P001,M001,W
P001,M002,D
P001,M003,L
```

Setiap peserta wajib punya 72 baris prediksi.

### `data/results.csv`

Hasil pertandingan.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `matchId` | `M001` | ID pertandingan. |
| `status` | `FINAL` | Status hasil. |
| `homeScore` | `2` | Skor Tim Nasional 1. Kosongkan jika belum final. |
| `awayScore` | `1` | Skor Tim Nasional 2. Kosongkan jika belum final. |
| `result` | `W` | `W`, `L`, atau `D` jika final. |
| `source` | `Manual` | Sumber update. |
| `updatedAt` | `2026-06-12T04:00:00+07:00` | Waktu update. |

Status yang valid:

- `PENDING`
- `LIVE`
- `FINAL`
- `POSTPONED`
- `CANCELLED`

Contoh hasil final:

```csv
matchId,status,homeScore,awayScore,result,source,updatedAt
M001,FINAL,2,1,W,Manual,2026-06-12T04:00:00+07:00
```

Contoh belum final:

```csv
matchId,status,homeScore,awayScore,result,source,updatedAt
M002,PENDING,,,,,
```

## Alur Entry Dari Kertas

1. Ambil kertas prediksi peserta.
2. Buat atau cari `participantId` peserta di `participants.csv`.
3. Masukkan 72 baris prediksi ke `predictions.csv`.
4. Gunakan `matchId` dari `matches.csv`.
5. Isi `prediction` dengan `W`, `L`, atau `D`.
6. Jalankan validasi:

   ```bash
   python scripts/validate_data.py
   ```

7. Jika validasi sukses, rebuild data website:

   ```bash
   python scripts/build_site_data.py
   ```

## Kesalahan Yang Sering Terjadi

- Peserta hanya punya 71 prediksi.
- Ada `participantId` yang tidak ada di `participants.csv`.
- Ada prediksi selain `W`, `L`, atau `D`.
- Ada duplikat untuk kombinasi peserta dan pertandingan yang sama.
- Hasil belum final tetapi kolom `result` sudah diisi.
