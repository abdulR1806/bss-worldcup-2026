# Streaming Opsional Ke YouTube

Streaming bersifat opsional. Website tetap bisa berjalan tanpa streaming.

## Cara Paling Mudah

Gunakan OBS di laptop/PC:

1. Buka website:

   ```text
   site/index.html?mode=stream
   ```

2. Di OBS, tambahkan source:
   - `Window Capture`, atau
   - `Browser Source` jika website sudah dipublish ke GitHub Pages.
3. Set resolusi OBS ke `1280x720`.
4. Masukkan stream key YouTube.
5. Klik `Start Streaming`.

## Jika Ingin 24/7 Di Cloud

Gunakan VPS murah.

Minimal rekomendasi:

- Ubuntu 24.04
- 2 vCPU
- 2 GB RAM
- bandwidth minimal 1.5 TB/bulan

Komponen:

- Chromium
- Xvfb
- FFmpeg
- systemd service

Arsitektur:

```text
GitHub Pages -> Chromium di VPS -> FFmpeg -> YouTube RTMPS
```

## Target Encoding 720p30

Contoh FFmpeg:

```bash
ffmpeg \
  -f x11grab -video_size 1280x720 -framerate 30 -i :99.0 \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -b:v 3000k -maxrate 3000k -bufsize 6000k \
  -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k \
  -f flv "$YOUTUBE_RTMPS_URL"
```

## Catatan Keamanan

- Jangan commit stream key YouTube.
- Simpan stream key di environment variable VPS.
- Test minimal 2 jam sebelum hari pertandingan.
- Pantau CPU VPS. Jika sering di atas 85%, turunkan bitrate atau upgrade VPS.
