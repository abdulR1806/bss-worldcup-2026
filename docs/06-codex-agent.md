# Codex Agent Dan Codex Cloud Review

Codex dipakai sebagai lapisan review tambahan. Validasi utama tetap GitHub Actions.

## Tujuan

Codex membantu mengecek:

- Logika skor berubah tanpa sengaja.
- Script update hasil mengambil data terlalu cepat.
- API key atau stream key tidak sengaja masuk ke repository.
- Website tidak lagi bisa dibuka langsung dari `file://`.
- Workflow GitHub melewati validasi.

## File Yang Sudah Disiapkan

```text
AGENTS.md
.github/codex/prompts/review.md
```

## Catatan GitHub Action

Workflow `Codex review` tidak dipakai di repository ini. Validasi otomatis utama tetap:

```text
.github/workflows/ci.yml
.github/workflows/update-results.yml
```

Jika nanti ingin mengaktifkan Codex GitHub Action lagi, buat ulang workflow review dan simpan `OPENAI_API_KEY` di GitHub Secrets.

## Setup Codex Cloud Automatic Review

Jika akun Anda punya akses Codex Cloud:

1. Buka pengaturan Codex:

   ```text
   https://chatgpt.com/codex/settings/code-review
   ```

2. Hubungkan repository GitHub.
3. Aktifkan Code Review untuk repository ini.
4. Aktifkan Automatic Reviews jika ingin setiap PR direview otomatis.

## Cara Meminta Review Manual

Di komentar pull request:

```text
@codex review
```

Untuk fokus tertentu:

```text
@codex review fokus pada scoring, CSV, dan update hasil API
```

## Cara Meminta Codex Memperbaiki

Jika Codex menemukan masalah dan Anda setuju:

```text
@codex fix the P1 issue
```

Tetap cek hasilnya dengan GitHub Actions sebelum merge.

## Rekomendasi

- Jangan jadikan Codex satu-satunya gate.
- Wajib tetap pakai `ci.yml`.
- Review pertama setelah setup harus dicek manual untuk memastikan prompt sudah sesuai.
- Simpan instruksi proyek di `AGENTS.md` agar Codex selalu tahu aturan leaderboard.
