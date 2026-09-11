# Pemandu Analisis Data

Aplikasi React + Vite yang menyusun peta jalan analisis data dari jenis data dan
tujuan yang kamu pilih. Pemanggilan model dilakukan lewat **Supabase Edge
Function**, jadi API key Claude tidak pernah sampai ke browser.

```
browser (Vite)  ──POST──>  Supabase Edge Function  ──>  Claude API
                            (menyimpan ANTHROPIC_API_KEY)
```

## Setup

### 1. Backend — Edge Function

```bash
npm install -g supabase        # kalau belum ada
supabase login
supabase link --project-ref <project-ref>

# API key hanya disimpan di server, bukan di .env frontend
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

supabase functions deploy generate-roadmap
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
**Project Settings → API**. Keduanya aman berada di frontend; `ANTHROPIC_API_KEY`
tidak.

## Menjalankan function secara lokal

```bash
supabase start
supabase functions serve generate-roadmap --env-file supabase/.env.local
```

Lalu arahkan `VITE_SUPABASE_URL` ke `http://localhost:54321`.

## Catatan teknis

- **Model**: `claude-opus-5`, `max_tokens` 16000.
- **Structured outputs**: respons dibatasi JSON Schema (`output_config.format`),
  sehingga bentuk JSON-nya dijamin valid — tidak ada lagi parser/penambal manual
  di sisi klien.
- **Prompt dikunci di server.** Klien hanya mengirim pilihan form, bukan prompt
  mentah, supaya endpoint ini tidak bisa dipakai sebagai proxy LLM umum.
- **Retry** hanya untuk status yang memang bisa pulih (408/429/5xx) dengan jeda
  bertambah. Error seperti 400/401/422 langsung dilaporkan apa adanya.
