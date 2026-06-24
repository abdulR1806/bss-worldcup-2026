# Panduan Isi CSV Dari Kertas Peserta

Data utama berada di folder `data/`. File CSV bisa diedit memakai Excel, Google Sheets, LibreOffice, atau text editor.

## File Yang Perlu Diisi

### `data/participants.csv`

Daftar peserta publik.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `id` | `P003` | ID unik peserta. Jangan diganti setelah dipakai di prediksi. |
| `displayName` | `Yanu` | Nama yang tampil di website. |
| `division` | `SME Credit Reviewer` | Divisi/unit peserta. |
| `badge` | `Y` | Huruf singkat untuk avatar peserta. |
| `date` | `2026-06-10` | Tanggal peserta didaftarkan (format `YYYY-MM-DD`). |

Contoh:

```csv
id,displayName,division,badge,date
P003,Yanu,SME Credit Reviewer,Y,2026-06-10
P004,Joko,SME Credit Reviewer,J,2026-06-10
```

> **Catatan:** ID peserta saat ini dimulai dari `P003`. Jangan gunakan `P001` atau `P002` — nilai tersebut sudah dicadangkan. ID baru harus dilanjutkan secara berurutan (contoh: `P011`, `P012`, dst.).

---

### `data/matches.csv`

Jadwal dan metadata seluruh 72 pertandingan Piala Dunia 2026. **File ini tidak perlu diedit secara manual** — sudah disiapkan sebelumnya dan hanya diperbarui jika ada perubahan jadwal resmi.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `id` | `M001` | ID unik pertandingan. Digunakan sebagai referensi di `predictions.csv` dan `results.csv`. |
| `matchNo` | `1` | Nomor urut pertandingan. |
| `kickoffText` | `12 Jun 2026, 02:00, A` | Label jadwal yang tampil di website (WIB). |
| `kickoffWib` | `2026-06-12T02:00:00+07:00` | Waktu kickoff resmi dalam format ISO 8601 (WIB). |
| `resultFetchAfterWib` | `2026-06-12T03:40:00+07:00` | Waktu paling awal untuk mengambil hasil otomatis dari API (biasanya kickoff + 100 menit). |
| `group` | `A` | Kode grup (`A`–`L`). |
| `homeTeam` | `Meksiko` | Nama tim tuan rumah dalam Bahasa Indonesia. |
| `awayTeam` | `Afrika Selatan` | Nama tim tamu dalam Bahasa Indonesia. |
| `location` | `Mexico City` | Kota tempat pertandingan. |

Contoh:

```csv
id,matchNo,kickoffText,kickoffWib,resultFetchAfterWib,group,homeTeam,awayTeam,location
M001,1,"12 Jun 2026, 02:00, A",2026-06-12T02:00:00+07:00,2026-06-12T03:40:00+07:00,A,Meksiko,Afrika Selatan,Mexico City
M002,2,"12 Jun 2026, 09:00, A",2026-06-12T09:00:00+07:00,2026-06-12T10:40:00+07:00,A,Korea Selatan,Ceko,Zapopan
```

---

### `data/predictions.csv`

Isi prediksi setiap peserta untuk seluruh 72 pertandingan.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `participantId` | `P003` | Harus sama dengan `id` di `participants.csv`. |
| `matchId` | `M001` | Harus sama dengan `id` di `matches.csv`. |
| `prediction` | `W` | Pilihan prediksi: `W`, `L`, atau `D`. |

Arti prediksi:

- `W`: Tim Nasional 1 (homeTeam) menang.
- `L`: Tim Nasional 1 (homeTeam) kalah.
- `D`: Seri.

Contoh:

```csv
participantId,matchId,prediction
P003,M001,D
P003,M002,W
P003,M003,W
```

Setiap peserta wajib punya **72 baris** prediksi (M001–M072).

---

### `data/results.csv`

Hasil pertandingan. Diisi secara manual atau otomatis oleh script setelah pertandingan selesai.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `matchId` | `M001` | ID pertandingan. |
| `status` | `FINAL` | Status hasil. |
| `homeScore` | `2` | Skor Tim Nasional 1. Kosongkan jika belum final. |
| `awayScore` | `1` | Skor Tim Nasional 2. Kosongkan jika belum final. |
| `result` | `W` | `W`, `L`, atau `D` jika final. Kosongkan jika belum final. |
| `source` | `Manual` | Sumber update (`Manual` atau nama API). |
| `updatedAt` | `2026-06-12T04:00:00+07:00` | Waktu update (format ISO 8601, WIB). |

Status yang valid:

- `PENDING` — Belum dimulai.
- `LIVE` — Sedang berlangsung.
- `FINAL` — Sudah selesai, hasil resmi.
- `POSTPONED` — Ditunda.
- `CANCELLED` — Dibatalkan.

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

---

### `data/team_aliases.csv`

Pemetaan nama tim dari Bahasa Indonesia (yang digunakan di `matches.csv`) ke nama resmi yang digunakan oleh API hasil pertandingan (`football-data.org`). **File ini tidak perlu diedit secara rutin** — hanya diperbarui jika API mengubah nama tim atau ada tim baru.

Kolom:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `templateTeam` | `Afrika Selatan` | Nama tim dalam Bahasa Indonesia, sesuai `matches.csv`. |
| `apiTeam` | `South Africa` | Nama tim dari API (bisa lebih dari satu, dipisah `\|`). |
| `notes` | `Football-data country name` | Keterangan sumber. |

Contoh:

```csv
templateTeam,apiTeam,notes
Afrika Selatan,South Africa,Football-data country name
Amerika Serikat,United States|USA,Football-data country name
Belanda,Netherlands|Holland,Football-data country name
```

---

## Alur Entry Dari Kertas

1. Ambil kertas prediksi peserta.
2. Buat atau cari `participantId` peserta di `participants.csv`. ID baru dilanjutkan dari nomor terakhir yang ada.
3. Masukkan 72 baris prediksi ke `predictions.csv`.
4. Gunakan `matchId` dari `matches.csv` (M001–M072).
5. Isi `prediction` dengan `W`, `L`, atau `D`.
6. Jalankan validasi:

   ```bash
   python scripts/validate_data.py
   ```

7. Jika validasi sukses, rebuild data website:

   ```bash
   python scripts/build_site_data.py
   ```

---

## Kesalahan Yang Sering Terjadi

- Peserta hanya punya kurang dari 72 prediksi.
- Ada `participantId` yang tidak ada di `participants.csv`.
- Ada `matchId` yang tidak ada di `matches.csv`.
- Ada prediksi selain `W`, `L`, atau `D`.
- Ada duplikat untuk kombinasi peserta dan pertandingan yang sama.
- Hasil belum final tetapi kolom `result` sudah diisi.
- Kolom `date` di `participants.csv` tidak diisi atau formatnya salah (harus `YYYY-MM-DD`).

---

### `data/standings.csv`

Klasemen resmi yang diekspor dari Google Sheet panitia pada sheet `SKOR`. File ini adalah sumber utama poin dan peringkat di website. Perhitungan skor dari `predictions.csv` + `results.csv` lama sudah tidak dipakai untuk menentukan klasemen.

Kolom minimum yang dibaca:

| Kolom | Contoh | Keterangan |
| --- | --- | --- |
| `Id participant` | `P003` | Harus sama dengan `id` di `participants.csv`. |
| `nama participan` | `Yanu` | Nama peserta dari sheet panitia. |
| `skor as is` | `24` | Nilai rekap mentah/as-is dari panitia, ditampilkan sebagai pembanding. |
| `total` | `31` | Total resmi yang dipakai sebagai poin klasemen. |

Kolom tambahan seperti `skor pertandingan ke 24` sampai `skor pertandingan selesai` boleh tetap ada di CSV. Script build hanya membutuhkan ID peserta dan `total` untuk klasemen.

Contoh:

```csv
Id participant,nama participan,skor as is,skor pertandingan ke 24,skor pertandingan selesai,total
P003,Yanu,28,,,28
P004,Joko,27,,,27
```

Untuk download CSV resmi dari Google Sheet publik ke `data/standings.csv`, isi `OFFICIAL_SCORE_SHEET_CSV_URL` lalu jalankan sync. `OFFICIAL_SCORE_SHEET_URL` bisa dipakai sebagai fallback jika URL mengandung `/spreadsheets/d/...` dan `gid` sheet `SKOR`:

```bash
OFFICIAL_SCORE_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=..."
python scripts/sync_google_sheet_standings.py
python scripts/build_site_data.py
```

Untuk menampilkan tautan/embedded Google Sheet di halaman Peserta dan Pertandingan, isi juga environment variable berikut sebelum menjalankan build:

```bash
OFFICIAL_SCORE_SHEET_URL="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
OFFICIAL_SCORE_SHEET_EMBED_URL="https://docs.google.com/spreadsheets/d/e/.../pubhtml?gid=...&single=true&widget=true&headers=false"
python scripts/build_site_data.py
```
