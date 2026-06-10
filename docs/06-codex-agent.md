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
.github/workflows/codex-review.yml
.github/codex/prompts/review.md
```

## Setup Codex GitHub Action

1. Buka GitHub repository.
2. Masuk ke:

   ```text
   Settings > Secrets and variables > Actions
   ```

3. Tambahkan secret:

   ```text
   OPENAI_API_KEY
   ```

4. Push file workflow:

   ```text
   .github/workflows/codex-review.yml
   ```

5. Buat pull request.
6. Workflow `Codex review` akan berjalan.

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
