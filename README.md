# Pemandu Analisis Data

Aplikasi React + Vite yang menyusun peta jalan analisis data dari jenis data dan
tujuan yang kamu pilih. Pemanggilan model dilakukan lewat **Supabase Edge
Function**, jadi API key tidak pernah sampai ke browser.

```
browser (Vite)  ──POST──>  Supabase Edge Function  ──>  Gemini API
                            (menyimpan GEMINI_API_KEY)
```

Gemini dipilih karena punya free tier, jadi aplikasi ini bisa jalan tanpa biaya
selama pemakaian masih di bawah kuota harian.

## Setup

### 1. Backend — Edge Function

```bash
npm install -g supabase        # kalau belum ada
supabase login
supabase link --project-ref <project-ref>

# API key hanya disimpan di server, bukan di .env frontend
supabase secrets set GEMINI_API_KEY=...

supabase functions deploy generate-roadmap
```

Ambil API key gratis di https://aistudio.google.com/apikey.

Nama model bisa diganti tanpa menyentuh kode — berguna kalau model defaultnya
sudah tidak tersedia lagi:

```bash
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
```

Opsional, untuk mengunci CORS ke domain produksimu saja (default `*`):

```bash
supabase secrets set ALLOWED_ORIGIN=https://domainmu.com
```

### 2. Frontend

```bash
cp .env.example .env      # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` ada di dashboard Supabase pada
**Project Settings → API**. Keduanya aman berada di frontend; `GEMINI_API_KEY`
tidak.

## Menjalankan function secara lokal

```bash
supabase start
supabase functions serve generate-roadmap --env-file supabase/.env.local
```

Lalu arahkan `VITE_SUPABASE_URL` ke `http://localhost:54321`.

## Catatan teknis

- **Model**: Gemini (default `gemini-2.5-flash`, ganti lewat secret
  `GEMINI_MODEL`), `maxOutputTokens` 8192.
- **Structured outputs**: respons dibatasi `responseSchema` +
  `responseMimeType: application/json`, sehingga bentuk JSON-nya dijamin valid —
  tidak ada parser/penambal manual di sisi klien. Skemanya memakai subset
  OpenAPI 3.0 milik Gemini (nama tipe UPPERCASE, tanpa `additionalProperties`).
- **Prompt dikunci di server.** Klien hanya mengirim pilihan form, bukan prompt
  mentah, supaya endpoint ini tidak bisa dipakai sebagai proxy LLM umum.
- **Retry** hanya untuk status yang memang bisa pulih (408/429/5xx) dengan jeda
  bertambah. Error seperti 400/401/422 langsung dilaporkan apa adanya.
