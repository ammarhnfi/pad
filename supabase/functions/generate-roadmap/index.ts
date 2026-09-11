// Proxy ke Gemini API. API key hanya hidup di sini (Supabase secrets),
// tidak pernah dikirim ke browser.
//
// Kontrak request/response ke frontend sengaja tidak diubah, jadi sisi klien
// tidak perlu tahu provider mana yang dipakai di belakang.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Bisa diganti tanpa ubah kode: supabase secrets set GEMINI_MODEL=...
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 8192;

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const fail = (message: string, code: string, status: number) =>
  reply({ error: { message, code } }, status);

// ── Sanitasi input ────────────────────────────────────────────────────────────
// Template prompt dikunci di server, klien hanya mengisi slot-slot di bawah ini.

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
       .slice(0, maxItems)
       .map((x) => x.trim().slice(0, maxLen))
       .filter(Boolean)
    : [];

function tujuanList(v: unknown) {
  if (!Array.isArray(v)) return [] as { label: string; desc: string }[];
  return v
    .slice(0, 9)
    .map((o) => ({
      label: str((o as Record<string, unknown>)?.label, 80),
      desc: str((o as Record<string, unknown>)?.desc, 120),
    }))
    .filter((o) => o.label);
}

// ── Skema keluaran ────────────────────────────────────────────────────────────
// Gemini memakai subset OpenAPI 3.0, bukan JSON Schema penuh: nama tipe
// UPPERCASE dan "additionalProperties" tidak didukung, jadi tidak dipakai
// di sini. propertyOrdering menjaga urutan field tetap stabil.

const KESULITAN = ["Mudah", "Sedang", "Sulit"];

function buildSchema(withEval: boolean) {
  const properties: Record<string, unknown> = {
    ringkasan: { type: "STRING" },
    kesulitan_keseluruhan: { type: "STRING", enum: KESULITAN },
    tahapan: {
      type: "ARRAY",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "OBJECT",
        properties: {
          nomor: { type: "INTEGER" },
          judul: { type: "STRING" },
          deskripsi: { type: "STRING" },
          metode: {
            type: "ARRAY",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "OBJECT",
              properties: {
                nama: { type: "STRING" },
                kelebihan: { type: "STRING" },
                kekurangan: { type: "STRING" },
                alternatif: { type: "STRING" },
              },
              required: ["nama", "kelebihan", "kekurangan", "alternatif"],
              propertyOrdering: ["nama", "kelebihan", "kekurangan", "alternatif"],
            },
          },
          alasan: { type: "STRING" },
          kesulitan: { type: "STRING", enum: KESULITAN },
        },
        required: ["nomor", "judul", "deskripsi", "metode", "alasan", "kesulitan"],
        propertyOrdering: ["nomor", "judul", "deskripsi", "metode", "alasan", "kesulitan"],
      },
    },
    asumsi: {
      type: "ARRAY",
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: { nama: { type: "STRING" }, cara_cek: { type: "STRING" } },
        required: ["nama", "cara_cek"],
        propertyOrdering: ["nama", "cara_cek"],
      },
    },
    tools: {
      type: "OBJECT",
      properties: {
        r: { type: "ARRAY", maxItems: 3, items: { type: "STRING" } },
        python: { type: "ARRAY", maxItems: 3, items: { type: "STRING" } },
      },
      required: ["r", "python"],
      propertyOrdering: ["r", "python"],
    },
    catatan: { type: "STRING" },
  };

  if (withEval) {
    properties.evaluasi_metode = {
      type: "OBJECT",
      properties: {
        metode: { type: "STRING" },
        kesesuaian: {
          type: "STRING",
          enum: ["Cocok", "Perlu Penyesuaian", "Kurang Cocok"],
        },
        alasan: { type: "STRING" },
        saran: { type: "STRING" },
      },
      required: ["metode", "kesesuaian", "alasan", "saran"],
      propertyOrdering: ["metode", "kesesuaian", "alasan", "saran"],
    };
  }

  const keys = Object.keys(properties);
  return { type: "OBJECT", properties, required: keys, propertyOrdering: keys };
}

// ── Prompt ────────────────────────────────────────────────────────────────────

interface Input {
  jenis: string[];
  struktur: string;
  ukuran: string;
  target: string;
  deskripsi: string;
  tujuan: { label: string; desc: string }[];
  supervised: boolean;
  unsupervised: boolean;
  spasial: boolean;
  metodePlanning: string;
}

function buildPrompt(i: Input) {
  const tags = [
    i.supervised ? ", supervised" : "",
    i.unsupervised ? ", unsupervised" : "",
    i.spasial ? ", spasial" : "",
  ].join("");

  const tujuanStr =
    i.tujuan.map((t) => (t.desc ? `${t.label}(${t.desc})` : t.label)).join(" + ") ||
    "N/A";

  const metodeInstr = i.metodePlanning
    ? `\nMETODE YANG DIRENCANAKAN: "${i.metodePlanning}"\n` +
      `→ Evaluasi kesesuaiannya. Integrasikan dalam tahapan jika cocok. ` +
      `Isi juga field "evaluasi_metode".`
    : "";

  return `Kamu konsultan statistika & data science. Buat peta jalan analisis berdasarkan:
DATA: jenis=${i.jenis.join(", ") || "N/A"}, struktur=${i.struktur || "N/A"}, sampel=${i.ukuran || "N/A"}, target=${i.target || "N/A"}${tags}
Deskripsi: ${i.deskripsi || "(tidak ada)"}
TUJUAN: ${tujuanStr}${metodeInstr}

Jawab dalam bahasa Indonesia. Teks sangat padat: "deskripsi" dan "alasan" maksimal 1 kalimat, "kelebihan" dan "kekurangan" cukup 1 frase.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return fail("Metode tidak didukung.", "method_not_allowed", 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("GEMINI_API_KEY belum diset di secrets Supabase.");
    return fail("Server belum dikonfigurasi.", "missing_api_key", 500);
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail("Body permintaan bukan JSON yang valid.", "invalid_body", 400);
  }

  const input: Input = {
    jenis: strList(raw.jenis, 8, 80),
    struktur: str(raw.struktur, 80),
    ukuran: str(raw.ukuran, 80),
    target: str(raw.target, 80),
    deskripsi: str(raw.deskripsi, 2000),
    tujuan: tujuanList(raw.tujuan),
    supervised: raw.supervised === true,
    unsupervised: raw.unsupervised === true,
    spasial: raw.spasial === true,
    metodePlanning: str(raw.metodePlanning, 500),
  };

  if (!input.jenis.length || !input.tujuan.length) {
    return fail("Jenis data dan tujuan analisis wajib diisi.", "missing_fields", 400);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: buildSchema(Boolean(input.metodePlanning)),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    });
  } catch (err) {
    console.error("Gagal menghubungi Gemini API:", err);
    return fail("Gagal menghubungi layanan model.", "upstream_unreachable", 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Gemini API membalas ${res.status}:`, detail.slice(0, 1000));

    if (res.status === 400) return fail("Permintaan ke layanan model ditolak.", "upstream_bad_request", 500);
    if (res.status === 401 || res.status === 403) return fail("Kredensial server ditolak.", "upstream_auth", 500);
    if (res.status === 429) return fail("Kuota gratis sedang penuh, coba lagi sebentar lagi.", "rate_limited", 429);
    return fail("Layanan model mengembalikan error.", "upstream_error", 502);
  }

  const data = await res.json().catch(() => null);

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    console.error("Permintaan diblokir filter Gemini:", blockReason);
    return fail("Permintaan ini tidak bisa diproses.", "blocked", 422);
  }

  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    console.error("Jawaban terpotong karena maxOutputTokens.");
    return fail("Jawaban terpotong, coba sederhanakan deskripsi.", "truncated", 502);
  }

  const text = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("");

  if (!text) {
    console.error("Respons tanpa teks. finishReason:", candidate?.finishReason);
    return fail("Model tidak mengembalikan jawaban.", "empty_response", 502);
  }

  try {
    return reply({ result: JSON.parse(text) });
  } catch {
    console.error("Jawaban bukan JSON valid:", text.slice(0, 1000));
    return fail("Jawaban model tidak bisa dibaca.", "invalid_json", 502);
  }
});
