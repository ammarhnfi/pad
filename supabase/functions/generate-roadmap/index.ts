// Proxy ke Claude API. API key hanya hidup di sini (Supabase secrets),
// tidak pernah dikirim ke browser.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 16000;

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
// Dipakai lewat structured outputs, jadi respons dijamin JSON valid sesuai bentuk ini.

const KESULITAN = ["Mudah", "Sedang", "Sulit"];

function buildSchema(withEval: boolean) {
  const properties: Record<string, unknown> = {
    ringkasan: { type: "string" },
    kesulitan_keseluruhan: { type: "string", enum: KESULITAN },
    tahapan: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          nomor: { type: "integer" },
          judul: { type: "string" },
          deskripsi: { type: "string" },
          metode: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "object",
              properties: {
                nama: { type: "string" },
                kelebihan: { type: "string" },
                kekurangan: { type: "string" },
                alternatif: { type: "string" },
              },
              required: ["nama", "kelebihan", "kekurangan", "alternatif"],
              additionalProperties: false,
            },
          },
          alasan: { type: "string" },
          kesulitan: { type: "string", enum: KESULITAN },
        },
        required: ["nomor", "judul", "deskripsi", "metode", "alasan", "kesulitan"],
        additionalProperties: false,
      },
    },
    asumsi: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: { nama: { type: "string" }, cara_cek: { type: "string" } },
        required: ["nama", "cara_cek"],
        additionalProperties: false,
      },
    },
    tools: {
      type: "object",
      properties: {
        r: { type: "array", maxItems: 3, items: { type: "string" } },
        python: { type: "array", maxItems: 3, items: { type: "string" } },
      },
      required: ["r", "python"],
      additionalProperties: false,
    },
    catatan: { type: "string" },
  };

  if (withEval) {
    properties.evaluasi_metode = {
      type: "object",
      properties: {
        metode: { type: "string" },
        kesesuaian: {
          type: "string",
          enum: ["Cocok", "Perlu Penyesuaian", "Kurang Cocok"],
        },
        alasan: { type: "string" },
        saran: { type: "string" },
      },
      required: ["metode", "kesesuaian", "alasan", "saran"],
      additionalProperties: false,
    };
  }

  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
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

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY belum diset di secrets Supabase.");
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

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildPrompt(input) }],
      output_config: {
        format: {
          type: "json_schema",
          schema: buildSchema(Boolean(input.metodePlanning)),
        },
      },
    });

    if (response.stop_reason === "refusal") {
      return fail("Permintaan ini tidak bisa diproses.", "refusal", 422);
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    if (!text) {
      console.error("Respons tanpa blok teks. stop_reason:", response.stop_reason);
      return fail("Model tidak mengembalikan jawaban.", "empty_response", 502);
    }

    return reply({ result: JSON.parse(text) });
  } catch (err) {
    console.error("Panggilan Claude API gagal:", err);

    if (err instanceof Anthropic.AuthenticationError) {
      return fail("Kredensial server ditolak.", "upstream_auth", 500);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return fail("Sedang ramai, coba lagi sebentar lagi.", "rate_limited", 429);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return fail("Gagal menghubungi layanan model.", "upstream_unreachable", 502);
    }
    if (err instanceof Anthropic.APIError) {
      const status = typeof err.status === "number" && err.status >= 500 ? 502 : 500;
      return fail("Layanan model mengembalikan error.", "upstream_error", status);
    }
    return fail("Terjadi kesalahan tak terduga di server.", "internal_error", 500);
  }
});
