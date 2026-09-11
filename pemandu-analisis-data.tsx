import React, { useState, useRef } from "react";
import {
  Compass, Hash, Tag, FileText, BarChart3, FlaskConical, TrendingUp, Layers,
  Network, Minimize2, Database, Target, Sparkles, Loader2, AlertTriangle,
  Wrench, ListChecks, Lightbulb, RefreshCw, CheckCircle2, ClipboardList,
  Download, BookOpen, Gauge, MapPin, AlertCircle, Calendar, GitBranch,
  ChevronDown, ChevronRight, Crosshair, XCircle
} from "lucide-react";

// ── Utilities ─────────────────────────────────────────────────────────────────

function repairJson(s) {
  let inStr = false, esc = false;
  const stack = [], out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i]; out.push(c);
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
  }
  if (inStr) out.push('"');
  let res = out.join("").replace(/,\s*$/, "").replace(/,(\s*[}\]])/g, "$1");
  while (stack.length) res += stack.pop() === "{" ? "}" : "]";
  return res;
}

function getEvalStyle(kesesuaian) {
  const k = (kesesuaian || "").toLowerCase();
  if (k.includes("kurang")) return { bg: "bg-rose-50", border: "border-rose-200", title: "text-rose-800", badge: "bg-rose-100 text-rose-700", inner: "bg-rose-100", icon: "text-rose-500", Icon: XCircle };
  if (k.includes("penyesuaian")) return { bg: "bg-amber-50", border: "border-amber-200", title: "text-amber-800", badge: "bg-amber-100 text-amber-700", inner: "bg-amber-100", icon: "text-amber-500", Icon: Lightbulb };
  return { bg: "bg-emerald-50", border: "border-emerald-200", title: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700", inner: "bg-emerald-100", icon: "text-emerald-500", Icon: CheckCircle2 };
}

const GC = {
  violet: { header: "bg-violet-50 border-violet-200 text-violet-700", dot: "bg-violet-400", aBg: "bg-violet-50", aBorder: "border-violet-500", aText: "text-violet-700", aIcon: "bg-violet-500" },
  teal:   { header: "bg-teal-50 border-teal-200 text-teal-700",     dot: "bg-teal-400",   aBg: "bg-teal-50",   aBorder: "border-teal-500",   aText: "text-teal-700",   aIcon: "bg-teal-500"   },
  orange: { header: "bg-orange-50 border-orange-200 text-orange-700", dot: "bg-orange-400", aBg: "bg-orange-50", aBorder: "border-orange-500", aText: "text-orange-700", aIcon: "bg-orange-500" },
};

// ── Small shared components ───────────────────────────────────────────────────

function KesulitanBadge({ level }) {
  if (!level) return null;
  const l = String(level).toLowerCase();
  const cls = l === "mudah" ? "bg-emerald-100 text-emerald-700" : l === "sulit" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {level}
    </span>
  );
}

function ArrowConn() {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className="h-5 w-px bg-slate-300" />
      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid #cbd5e1" }} />
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${active ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function EvaluasiCard({ ev }) {
  if (!ev) return null;
  const s = getEvalStyle(ev.kesesuaian);
  const { Icon } = s;
  return (
    <div className={`rounded-2xl border p-5 ${s.bg} ${s.border}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Icon className={`h-5 w-5 flex-shrink-0 ${s.icon}`} />
        <span className="text-sm font-semibold text-slate-800">Evaluasi Metode Rencanamu</span>
        <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 shadow-sm">{ev.metode}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.badge}`}>{ev.kesesuaian}</span>
      </div>
      {ev.alasan && <p className={`text-sm leading-relaxed ${s.title}`}>{ev.alasan}</p>}
      {ev.saran && (
        <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 ${s.inner}`}>
          <Sparkles className={`mt-0.5 h-4 w-4 flex-shrink-0 ${s.icon}`} />
          <p className="text-xs leading-relaxed text-slate-700">{ev.saran}</p>
        </div>
      )}
    </div>
  );
}

// ── BaganAlur ─────────────────────────────────────────────────────────────────

function BaganAlur({ result, jenisLabels, tujuanLabels, evaluasi }) {
  const [expanded, setExpanded] = useState(null);
  const es = evaluasi ? getEvalStyle(evaluasi.kesesuaian) : null;

  function stepColor(level) {
    const l = (level || "").toLowerCase();
    if (l === "mudah") return { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800" };
    if (l === "sulit")  return { bg: "bg-rose-50",   border: "border-rose-300",   text: "text-rose-800"   };
    return                     { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-800"  };
  }

  return (
    <div className="mx-auto max-w-sm py-2">
      <div className="mb-4 flex justify-center gap-5 text-xs text-slate-500">
        {[["bg-emerald-400","Mudah"],["bg-amber-400","Sedang"],["bg-rose-400","Sulit"]].map(([dot,lbl]) => (
          <span key={lbl} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dot}`} />{lbl}
          </span>
        ))}
      </div>

      <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 p-3 text-center shadow-sm">
        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-indigo-700">
          <Database className="h-4 w-4" /> Input Data
        </div>
        <p className="mt-1 text-xs text-indigo-500">{jenisLabels || "—"}</p>
        <p className="text-xs font-medium text-indigo-600">Tujuan: {tujuanLabels || "—"}</p>
      </div>

      {evaluasi && es && (
        <>
          <ArrowConn />
          <div className={`rounded-xl border-2 p-3 ${es.bg} ${es.border}`}>
            <div className="flex items-center justify-center gap-2">
              <es.Icon className={`h-4 w-4 ${es.icon}`} />
              <span className="text-xs font-bold text-slate-700">Rencana:</span>
              <span className="rounded bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">{evaluasi.metode}</span>
            </div>
            <div className="mt-1.5 flex justify-center">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${es.badge}`}>{evaluasi.kesesuaian}</span>
            </div>
            {evaluasi.saran && <p className={`mt-1.5 text-center text-xs leading-relaxed ${es.title}`}>{evaluasi.saran}</p>}
          </div>
        </>
      )}

      {(result.tahapan || []).map((t, i) => {
        const c = stepColor(t.kesulitan);
        const open = expanded === i;
        const methods = Array.isArray(t.metode) ? t.metode : [];
        return (
          <div key={i}>
            <ArrowConn />
            <button
              onClick={() => setExpanded(open ? null : i)}
              className={`w-full rounded-xl border-2 p-3 text-left transition-all ${c.bg} ${open ? c.border : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                    {t.nomor || i + 1}
                  </span>
                  <span className={`text-sm font-semibold leading-tight ${c.text}`}>{t.judul}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <KesulitanBadge level={t.kesulitan} />
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
              {!open && t.deskripsi && <p className={`mt-1.5 text-xs leading-relaxed opacity-75 ${c.text}`}>{t.deskripsi}</p>}
            </button>
            {open && (
              <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-3 space-y-2">
                {t.deskripsi && <p className="text-xs leading-relaxed text-slate-600">{t.deskripsi}</p>}
                {methods.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Metode</div>
                    {methods.map((m, j) => {
                      const nama = typeof m === "string" ? m : m.nama;
                      return (
                        <div key={j} className="rounded-lg bg-slate-50 p-2 text-xs">
                          <div className="font-semibold text-slate-800">{nama}</div>
                          {typeof m === "object" && (
                            <div className="mt-1 space-y-0.5">
                              {m.kelebihan && <div className="flex gap-1 text-emerald-700"><span className="font-bold">+</span><span>{m.kelebihan}</span></div>}
                              {m.kekurangan && <div className="flex gap-1 text-rose-600"><span className="font-bold">−</span><span>{m.kekurangan}</span></div>}
                              {m.alternatif && <div className="flex gap-1 text-indigo-600"><span>⇄</span><span>Alt: {m.alternatif}</span></div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {t.alasan && (
                  <div className="flex gap-2 rounded-lg bg-amber-50 p-2">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                    <p className="text-xs text-amber-700">{t.alasan}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <ArrowConn />
      <div className="rounded-xl border-2 border-violet-400 bg-violet-50 p-3 text-center shadow-sm">
        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-violet-700">
          <Sparkles className="h-4 w-4" /> Output / Hasil
        </div>
        {result.catatan && <p className="mt-1 text-xs leading-relaxed text-violet-500">{result.catatan}</p>}
        {result.kesulitan_keseluruhan && (
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-violet-600">
            <Gauge className="h-3.5 w-3.5" /> Kesulitan: <KesulitanBadge level={result.kesulitan_keseluruhan} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── PrintOverlay ──────────────────────────────────────────────────────────────

function PrintOverlay({ result, jenisStr, tujuanStr, metodePlanning, tgl, deskripsi, struktur, ukuran, target, onClose }) {
  const ev = result.evaluasi_metode;
  const n = result.tahapan?.length || 0;

  // Colour helpers (inline styles only – no Tailwind in overlay)
  const diffBg = lv => { const l = (lv||"").toLowerCase(); return l==="mudah"?"#d1fae5":l==="sulit"?"#fee2e2":"#fef3c7"; };
  const diffTx = lv => { const l = (lv||"").toLowerCase(); return l==="mudah"?"#065f46":l==="sulit"?"#991b1b":"#92400e"; };

  let evalBg = "#f0fdf4", evalBd = "#86efac", evalTx = "#065f46";
  if (ev) {
    const k = (ev.kesesuaian || "").toLowerCase();
    if (k.includes("kurang"))       { evalBg = "#fff1f2"; evalBd = "#fda4af"; evalTx = "#9f1239"; }
    else if (k.includes("penyesuaian")) { evalBg = "#fffbeb"; evalBd = "#fcd34d"; evalTx = "#92400e"; }
  }

  const sn = { g: 1, e: ev ? 2 : null, p: ev ? 3 : 2, a: ev ? 4 : 3, t: ev ? 5 : 4 };

  function downloadHTML() {
    const el = document.getElementById('print-content-inner');
    if (!el) return;
    const fullHTML = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Peta Jalan Analisis Data</title><style>*{box-sizing:border-box;margin:0;padding:0}body{padding:40px 48px;font-family:system-ui,-apple-system,sans-serif}@media print{body{padding:20px}}</style></head><body>${el.innerHTML}</body></html>`;
    try {
      const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'peta-jalan-analisis.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) { console.error('Download error:', e); }
  }

  // Render helpers – called as functions, not JSX components
  const renderH2 = (num, txt) => (
    <h2 style={{ color:"#312e81", fontSize:"18px", fontWeight:"700", marginTop:"40px", marginBottom:"14px", paddingLeft:"14px", borderLeft:"4px solid #4f46e5" }}>
      {num}. {txt}
    </h2>
  );

  const renderMethodTable = (metode) => {
    if (!Array.isArray(metode) || !metode.length) return null;
    const thStyle = { background:"#f1f5f9", padding:"8px 12px", textAlign:"left", border:"1px solid #e2e8f0", fontWeight:"600", fontSize:"12px", color:"#475569" };
    const tdBase  = { padding:"9px 12px", border:"1px solid #e2e8f0", verticalAlign:"top" };
    return (
      <div style={{ overflowX:"auto", margin:"12px 0 20px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13.5px", minWidth:"380px" }}>
          <thead>
            <tr>
              {["Metode","Kelebihan (+)","Kekurangan (−)","Alternatif (⇄)"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metode.map((m, j) => {
              if (typeof m === "string") return (
                <tr key={j}><td colSpan={4} style={tdBase}>{m}</td></tr>
              );
              return (
                <tr key={j}>
                  <td style={{ ...tdBase, fontWeight:"600", color:"#1e293b" }}>{m.nama || "—"}</td>
                  <td style={{ ...tdBase, color:"#059669" }}>{m.kelebihan || "—"}</td>
                  <td style={{ ...tdBase, color:"#e11d48" }}>{m.kekurangan || "—"}</td>
                  <td style={{ ...tdBase, color:"#4f46e5" }}>{m.alternatif || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const metaRows = [
    ["Jenis variabel",  jenisStr],
    ["Struktur data",   struktur || null],
    ["Ukuran sampel",   ukuran   || null],
    ["Variabel target", target   || null],
    ["Tujuan analisis", tujuanStr],
    deskripsi      ? ["Deskripsi data",  deskripsi]      : null,
    metodePlanning ? ["Metode rencana",  metodePlanning] : null,
  ].filter(Boolean);

  return (
    <div id="print-overlay" style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", background:"#fff", zIndex:9999, overflowY:"auto" }}>

      {/* ── Toolbar (hidden when printing) ── */}
      <div className="no-print" style={{ position:"sticky", top:0, background:"#f8fafc", borderBottom:"1px solid #e2e8f0", padding:"12px 24px", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap", zIndex:10 }}>
        <button
          onClick={() => window.print()}
          style={{ display:"flex", alignItems:"center", gap:"8px", background:"#4f46e5", color:"#fff", border:"none", borderRadius:"8px", padding:"9px 18px", fontWeight:"600", fontSize:"14px", cursor:"pointer" }}
        >
          <Download style={{ width:16, height:16 }} /> Cetak / Simpan sebagai PDF
        </button>
        <button
          onClick={downloadHTML}
          style={{ display:"flex", alignItems:"center", gap:"8px", background:"#1e293b", color:"#fff", border:"none", borderRadius:"8px", padding:"9px 18px", fontWeight:"600", fontSize:"14px", cursor:"pointer" }}
        >
          <Download style={{ width:16, height:16 }} /> Unduh ke Komputer
        </button>
        <button
          onClick={onClose}
          style={{ display:"flex", alignItems:"center", gap:"6px", border:"1px solid #d1d5db", background:"#fff", borderRadius:"8px", padding:"9px 14px", fontSize:"14px", cursor:"pointer", color:"#374151" }}
        >
          <XCircle style={{ width:15, height:15 }} /> Tutup
        </button>
        <span style={{ fontSize:"12px", color:"#6b7280" }}>
          <strong>Unduh</strong> → file HTML tersimpan di komputermu · <strong>Cetak</strong> → langsung ke printer / PDF
        </span>
      </div>

      {/* ── Narrative document ── */}
      <div id="print-content-inner" style={{ maxWidth:"800px", margin:"0 auto", padding:"48px 48px 80px", fontFamily:"system-ui,-apple-system,sans-serif", lineHeight:"1.85", color:"#1e293b", fontSize:"15px" }}>

        <h1 style={{ color:"#1e1b4b", fontSize:"28px", fontWeight:"800", borderBottom:"3px solid #4f46e5", paddingBottom:"16px", marginBottom:"6px" }}>
          Peta Jalan Analisis Data
        </h1>
        <p style={{ color:"#6b7280", fontSize:"13px", marginBottom:"28px" }}>Disusun oleh Pemandu Analisis Data · {tgl}</p>

        {/* Context table */}
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px 24px", marginBottom:"36px" }}>
          {metaRows.map(([lbl, val]) => val ? (
            <div key={lbl} style={{ display:"flex", gap:"12px", marginBottom:"8px", fontSize:"14px" }}>
              <span style={{ color:"#64748b", minWidth:"140px", flexShrink:0 }}>{lbl}</span>
              <span style={{ color:"#1e293b", fontWeight:"500" }}>{val}</span>
            </div>
          ) : null)}
        </div>

        {/* Section 1 */}
        {renderH2(sn.g, "Gambaran Umum")}
        {result.kesulitan_keseluruhan && (
          <div style={{ display:"inline-block", background:diffBg(result.kesulitan_keseluruhan), borderRadius:"8px", padding:"6px 16px", marginBottom:"14px", fontSize:"14px", color:diffTx(result.kesulitan_keseluruhan), fontWeight:"600" }}>
            Estimasi tingkat kesulitan keseluruhan: {result.kesulitan_keseluruhan}
          </div>
        )}
        <p style={{ margin:"0 0 14px" }}>{result.ringkasan}</p>
        <p style={{ margin:"0 0 14px" }}>
          Secara keseluruhan, analisis ini mencakup <strong>{n} tahapan utama</strong> yang dirancang secara berurutan dan saling berkesinambungan — mulai dari pemahaman awal terhadap data mentah hingga interpretasi hasil akhir. Setiap tahapan membangun di atas fondasi yang diletakkan oleh tahap sebelumnya.
        </p>

        {/* Section 2: Evaluasi (opsional) */}
        {ev && (
          <>
            {renderH2(sn.e, "Evaluasi Metode yang Direncanakan")}
            <div style={{ background:evalBg, border:`1px solid ${evalBd}`, borderRadius:"12px", padding:"20px 24px", marginBottom:"20px" }}>
              <p style={{ margin:"0 0 12px" }}>
                Berdasarkan evaluasi terhadap konteks data dan tujuan analisis yang ditetapkan, metode{" "}
                <strong style={{ fontFamily:"monospace", background:"rgba(255,255,255,0.8)", padding:"1px 8px", borderRadius:"4px" }}>{ev.metode}</strong>{" "}
                yang direncanakan dinilai: <strong style={{ color:evalTx }}>{ev.kesesuaian}</strong>.
              </p>
              {ev.alasan && <p style={{ margin:"0 0 12px" }}>{ev.alasan}</p>}
              {ev.saran  && <p style={{ margin:0, fontStyle:"italic" }}><strong>Rekomendasi:</strong> {ev.saran}</p>}
            </div>
          </>
        )}

        {/* Section: Peta Jalan */}
        {renderH2(sn.p, "Peta Jalan Analisis")}
        <p style={{ margin:"0 0 24px" }}>
          Berikut adalah tahapan analisis yang perlu dijalankan secara berurutan. Output dari satu tahap menjadi landasan metodologis bagi tahap berikutnya, sehingga penting untuk memastikan setiap langkah diselesaikan dengan baik sebelum melanjutkan.
        </p>

        {(result.tahapan || []).map((t, i) => {
          const isLast = i === n - 1;
          const next   = isLast ? null : result.tahapan[i + 1];
          return (
            <div key={i} style={{ marginBottom:"32px", paddingLeft:"20px", borderLeft:"3px solid #e0e7ff" }}>
              <h3 style={{ color:"#3730a3", fontSize:"16px", fontWeight:"700", margin:"0 0 12px", display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff", fontSize:"13px", fontWeight:"700", flexShrink:0 }}>
                  {t.nomor || i + 1}
                </span>
                {t.judul}
                {t.kesulitan && (
                  <span style={{ fontSize:"12px", background:diffBg(t.kesulitan), color:diffTx(t.kesulitan), padding:"2px 10px", borderRadius:"20px", fontWeight:"600" }}>
                    {t.kesulitan}
                  </span>
                )}
              </h3>
              <p style={{ margin:"0 0 12px" }}>{t.deskripsi}</p>
              {t.alasan && (
                <p style={{ margin:"0 0 12px" }}>
                  Tahap ini perlu dilakukan karena {t.alasan.charAt(0).toLowerCase() + t.alasan.slice(1)}
                </p>
              )}
              {Array.isArray(t.metode) && t.metode.length > 0 && (
                <>
                  <p style={{ fontWeight:"600", marginBottom:"4px", fontSize:"14px", color:"#374151" }}>Metode yang disarankan:</p>
                  {renderMethodTable(t.metode)}
                </>
              )}
              <p style={{ margin:0, color:"#64748b", fontStyle:"italic", fontSize:"14px", lineHeight:"1.75" }}>
                {isLast
                  ? "Dengan selesainya seluruh rangkaian tahapan ini, analisis telah mencakup semua aspek yang diperlukan untuk menghasilkan insight yang valid, reliabel, dan dapat dipertanggungjawabkan secara ilmiah."
                  : <span>Setelah tahap ini diselesaikan dan hasilnya divalidasi, proses berlanjut ke <em>{next.judul}</em> — yang memanfaatkan output tahap ini sebagai landasan kerjanya.</span>
                }
              </p>
              {!isLast && <hr style={{ border:"none", borderTop:"1px dashed #e2e8f0", margin:"28px 0 0" }} />}
            </div>
          );
        })}

        {/* Asumsi */}
        {Array.isArray(result.asumsi) && result.asumsi.length > 0 && (
          <>
            {renderH2(sn.a, "Asumsi yang Perlu Diverifikasi")}
            <p style={{ margin:"0 0 16px" }}>
              Sebelum memulai analisis, terdapat beberapa prasyarat statistik yang perlu diverifikasi. Mengabaikannya berisiko menghasilkan kesimpulan yang bias atau keliru secara metodologis.
            </p>
            <ul style={{ paddingLeft:"22px", margin:"0 0 16px", lineHeight:"1.9" }}>
              {result.asumsi.map((a, i) => (
                <li key={i} style={{ marginBottom:"10px" }}>
                  <strong>{a.nama}</strong>{a.cara_cek ? ` — ${a.cara_cek}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Tools */}
        {result.tools && (result.tools.r?.length || result.tools.python?.length) && (
          <>
            {renderH2(sn.t, "Rekomendasi Tools dan Library")}
            <p style={{ margin:"0 0 18px" }}>
              Implementasi seluruh tahapan dapat dilakukan menggunakan R maupun Python. Pilihan sebaiknya disesuaikan dengan keakraban tim dan kebutuhan integrasi sistem.
            </p>
            <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", margin:"0 0 20px" }}>
              {result.tools.r?.length > 0 && (
                <div style={{ flex:1, minWidth:"180px", background:"#eff6ff", borderRadius:"10px", padding:"16px 18px" }}>
                  <div style={{ fontWeight:"700", color:"#1d4ed8", marginBottom:"10px", fontSize:"14px" }}>Bahasa R</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                    {result.tools.r.map((p, i) => (
                      <code key={i} style={{ background:"#dbeafe", color:"#1e40af", padding:"3px 9px", borderRadius:"5px", fontSize:"13px", fontFamily:"monospace" }}>{p}</code>
                    ))}
                  </div>
                </div>
              )}
              {result.tools.python?.length > 0 && (
                <div style={{ flex:1, minWidth:"180px", background:"#fefce8", borderRadius:"10px", padding:"16px 18px" }}>
                  <div style={{ fontWeight:"700", color:"#854d0e", marginBottom:"10px", fontSize:"14px" }}>Python</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                    {result.tools.python.map((p, i) => (
                      <code key={i} style={{ background:"#fef08a", color:"#713f12", padding:"3px 9px", borderRadius:"5px", fontSize:"13px", fontFamily:"monospace" }}>{p}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Catatan */}
        {result.catatan && (
          <>
            <h2 style={{ color:"#312e81", fontSize:"18px", fontWeight:"700", marginTop:"40px", marginBottom:"14px", paddingLeft:"14px", borderLeft:"4px solid #4f46e5" }}>
              Catatan Penutup
            </h2>
            <p style={{ margin:"0 0 14px" }}>
              {result.catatan} Peta jalan ini bersifat panduan metodologis dan dapat disesuaikan seiring berkembangnya pemahaman terhadap data.
            </p>
          </>
        )}

        <div style={{ marginTop:"56px", borderTop:"1px solid #e2e8f0", paddingTop:"16px", fontSize:"12px", color:"#94a3b8", textAlign:"center" }}>
          Dokumen ini dibuat secara otomatis oleh Pemandu Analisis Data · {tgl}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [jenisVar, setJenisVar]             = useState([]);
  const [struktur, setStruktur]             = useState("");
  const [ukuran, setUkuran]                 = useState("");
  const [target, setTarget]                 = useState("");
  const [deskripsi, setDeskripsi]           = useState("");
  const [metodePlanning, setMetodePlanning] = useState("");
  const [tujuan, setTujuan]                 = useState([]);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState("");
  const [tab, setTab]                       = useState("detail");
  const [showPrint, setShowPrint]           = useState(false);
  const resultRef = useRef(null);

  const jenisOpts = [
    { id:"numerik",   label:"Numerik / Kontinu", icon:Hash    },
    { id:"kategorik", label:"Kategorik",          icon:Tag     },
    { id:"spasial",   label:"Spasial",             icon:MapPin  },
    { id:"teks",      label:"Teks",                icon:FileText},
  ];

  const tujuanGroups = [
    { color:"violet", label:"Supervised",             hint:"Ada variabel target / label",
      opts:[{id:"regresi",label:"Regresi / Prediksi",desc:"Target numerik",icon:TrendingUp},{id:"klasifikasi",label:"Klasifikasi",desc:"Target kategorik",icon:Layers},{id:"forecasting",label:"Forecasting",desc:"Prediksi deret waktu",icon:Calendar}] },
    { color:"teal",   label:"Unsupervised",           hint:"Tanpa variabel label/target",
      opts:[{id:"clustering",label:"Clustering",desc:"Temukan segmen alami",icon:Network},{id:"reduksi",label:"Reduksi Dimensi",desc:"Sederhanakan variabel",icon:Minimize2},{id:"anomali",label:"Deteksi Anomali",desc:"Temukan data tak wajar",icon:AlertCircle}] },
    { color:"orange", label:"Eksplorasi & Inferensi", hint:"Memahami, merangkum, menguji",
      opts:[{id:"deskriptif",label:"Deskriptif",desc:"Ringkas & pahami data",icon:BarChart3},{id:"inferensi",label:"Inferensi",desc:"Uji hipotesis & hubungan",icon:FlaskConical},{id:"spasialA",label:"Analisis Spasial",desc:"Pola & distribusi lokasi",icon:MapPin}] },
  ];
  const allTujuan = tujuanGroups.flatMap(g => g.opts);

  const contoh = [
    { nama:"Penjualan Bulanan", icon:TrendingUp,   s:{ jenis:["numerik"],              str:"Time series",   uk:"Sedang (100–1.000)", tg:"Ada",         desk:"Data penjualan bulanan 3 tahun: tanggal, kategori produk, jumlah unit.", tuj:["forecasting"] } },
    { nama:"Survei Kepuasan",   icon:FlaskConical, s:{ jenis:["numerik","kategorik"],   str:"Cross-section", uk:"Sedang (100–1.000)", tg:"Tidak yakin",  desk:"Kuesioner: skor kepuasan 1-5, usia, gender, lama berlangganan.",        tuj:["deskriptif","inferensi"] } },
    { nama:"Diagnosis Pasien",  icon:Layers,       s:{ jenis:["numerik","kategorik"],   str:"Cross-section", uk:"Sedang (100–1.000)", tg:"Ada",         desk:"Data medis: glukosa, tekanan darah, BMI, usia, label diabetes ya/tidak.", tuj:["klasifikasi"] } },
    { nama:"Lokasi & Demografi",icon:MapPin,       s:{ jenis:["numerik","spasial"],     str:"Cross-section", uk:"Sedang (100–1.000)", tg:"Tidak ada",    desk:"Data wilayah: koordinat, kepadatan penduduk, nilai penjualan per area.", tuj:["spasialA","clustering"] } },
  ];

  const togJenis  = id => setJenisVar(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const togTujuan = id => setTujuan(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const applyEx   = c  => { setJenisVar(c.s.jenis); setStruktur(c.s.str); setUkuran(c.s.uk); setTarget(c.s.tg); setDeskripsi(c.s.desk); setTujuan(c.s.tuj); setMetodePlanning(""); setResult(null); setError(""); };
  const reset     = () => { setJenisVar([]); setStruktur(""); setUkuran(""); setTarget(""); setDeskripsi(""); setMetodePlanning(""); setTujuan([]); setResult(null); setError(""); setShowPrint(false); };

  function buildPrompt() {
    const jL = jenisVar.map(id => jenisOpts.find(o => o.id === id)?.label).join(", ") || "N/A";
    const tL = tujuan.map(id => { const o = allTujuan.find(x => x.id === id); return o ? `${o.label}(${o.desc})` : id; }).join(" + ") || "N/A";
    const isS  = tujuan.some(id => ["regresi","klasifikasi","forecasting"].includes(id));
    const isU  = tujuan.some(id => ["clustering","reduksi","anomali"].includes(id));
    const isSp = jenisVar.includes("spasial") || tujuan.includes("spasialA");
    const hasPlan = metodePlanning.trim().length > 0;
    const metodeInstr = hasPlan ? `\nMETODE YANG DIRENCANAKAN: "${metodePlanning.trim()}"\n→ Evaluasi kesesuaiannya. Integrasikan dalam tahapan jika cocok. Wajib sertakan "evaluasi_metode".` : "";
    const evalSchema  = hasPlan ? `,"evaluasi_metode":{"metode":"${metodePlanning.trim()}","kesesuaian":"Cocok|Perlu Penyesuaian|Kurang Cocok","alasan":"penilaian 1-2 kalimat","saran":"rekomendasi konkret 1 kalimat"}` : "";
    return `Kamu konsultan statistika & data science. Buat peta jalan analisis berdasarkan:
DATA: jenis=${jL}, struktur=${struktur||"N/A"}, sampel=${ukuran||"N/A"}, target=${target||"N/A"}${isS?", supervised":""}${isU?", unsupervised":""}${isSp?", spasial":""}
Deskripsi: ${deskripsi||"(tidak ada)"}
TUJUAN: ${tL}${metodeInstr}
Jawab HANYA satu objek JSON valid (bahasa Indonesia), tanpa preamble, tanpa markdown:
{"ringkasan":"2 kalimat","kesulitan_keseluruhan":"Mudah|Sedang|Sulit","tahapan":[{"nomor":1,"judul":"singkat","deskripsi":"1 kalimat","metode":[{"nama":"nama","kelebihan":"1 frase","kekurangan":"1 frase","alternatif":"nama alternatif"}],"alasan":"1 kalimat","kesulitan":"Mudah|Sedang|Sulit"}],"asumsi":[{"nama":"asumsi","cara_cek":"cara cek"}],"tools":{"r":["pkg"],"python":["lib"]},"catatan":"1 kalimat"${evalSchema}}
Aturan: 4-6 tahapan, maks 2 metode/tahap, maks 3 asumsi, maks 3 tools per bahasa. Teks sangat padat.`;
  }

  function tryParse(text) {
    let s = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const a = s.indexOf("{");
    if (a === -1) return null;
    const b = s.lastIndexOf("}");
    s = b > a ? s.slice(a, b + 1) : s.slice(a);
    try { return JSON.parse(s); } catch (_) {}
    try { return JSON.parse(repairJson(s)); } catch (_) {}
    return null;
  }

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    const prompt = buildPrompt();
    let parsed = null;
    for (let i = 0; i < 2 && !parsed; i++) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content:prompt }] }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        parsed = tryParse(d.content.filter(b => b.type === "text").map(b => b.text).join("\n"));
      } catch (e) { console.error(e); }
    }
    if (parsed?.tahapan?.length) {
      setResult(parsed);
      setTab("detail");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
    } else {
      setError("Maaf, terjadi kendala. Coba tekan tombolnya lagi ya.");
    }
    setLoading(false);
  }

  const canSubmit  = tujuan.length > 0 && jenisVar.length > 0 && !loading;
  const jenisStr   = jenisVar.map(id => jenisOpts.find(o => o.id === id)?.label).join(", ");
  const tujuanStr  = tujuan.map(id => allTujuan.find(o => o.id === id)?.label).filter(Boolean).join(" + ");
  const tgl = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <style>{`@media print{body *{visibility:hidden}#print-overlay,#print-overlay *{visibility:visible}#print-overlay{position:absolute;left:0;top:0;width:100%}.no-print{display:none!important}body{background:white!important;margin:0!important}}`}</style>
        <div className="mx-auto max-w-3xl px-4 py-8">

          {/* Header */}
          <div className="no-print mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
              <Compass className="h-7 w-7 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-3xl font-bold text-transparent">
              Pemandu Analisis Data
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Masukkan data yang kamu punya dan tujuanmu — biar disusunkan peta jalan analisisnya.
            </p>
          </div>

          {/* Contoh datasets */}
          <div className="no-print mb-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
              <BookOpen className="h-4 w-4 text-indigo-500" /> Coba contoh dataset:
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {contoh.map(c => {
                const Icon = c.icon;
                return (
                  <button key={c.nama} onClick={() => applyEx(c)} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="leading-tight">{c.nama}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 1: Data */}
          <div className="no-print mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-800">Apa yang kamu punya?</h2>
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Jenis variabel <span className="text-slate-400">(boleh lebih dari satu)</span></label>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {jenisOpts.map(o => {
                const Icon = o.icon;
                const active = jenisVar.includes(o.id);
                return (
                  <button key={o.id} onClick={() => togJenis(o.id)} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${active ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium leading-tight">{o.label}</span>
                  </button>
                );
              })}
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Struktur data</label>
            <div className="mb-5 flex flex-wrap gap-2">
              {["Cross-section","Time series","Panel (longitudinal)"].map(o => (
                <Pill key={o} active={struktur === o} onClick={() => setStruktur(struktur === o ? "" : o)}>{o}</Pill>
              ))}
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Ukuran sampel</label>
            <div className="mb-5 flex flex-wrap gap-2">
              {["Kecil (< 100)","Sedang (100–1.000)","Besar (> 1.000)"].map(o => (
                <Pill key={o} active={ukuran === o} onClick={() => setUkuran(ukuran === o ? "" : o)}>{o}</Pill>
              ))}
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Ada variabel target / dependen?</label>
            <div className="mb-5 flex flex-wrap gap-2">
              {["Ada","Tidak ada","Tidak yakin"].map(o => (
                <Pill key={o} active={target === o} onClick={() => setTarget(target === o ? "" : o)}>{o}</Pill>
              ))}
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Deskripsi tambahan <span className="text-slate-400">(opsional)</span></label>
            <textarea
              value={deskripsi}
              onChange={e => setDeskripsi(e.target.value)}
              rows={3}
              placeholder="Contoh: data penjualan bulanan 3 tahun, kolom tanggal, produk, jumlah terjual..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:bg-white"
            />
          </div>

          {/* Card 2: Tujuan */}
          <div className="no-print mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-500" />
                <h2 className="text-base font-semibold text-slate-800">Apa tujuanmu?</h2>
              </div>
              <span className="text-xs text-slate-400">boleh lebih dari satu</span>
            </div>
            <div className="space-y-4">
              {tujuanGroups.map(g => {
                const gc = GC[g.color];
                return (
                  <div key={g.color}>
                    <div className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 ${gc.header}`}>
                      <span className={`h-2 w-2 rounded-full ${gc.dot}`} />
                      <span className="text-xs font-bold">{g.label}</span>
                      <span className="text-xs opacity-70">— {g.hint}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {g.opts.map(o => {
                        const Icon = o.icon;
                        const active = tujuan.includes(o.id);
                        return (
                          <button key={o.id} onClick={() => togTujuan(o.id)} className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${active ? `${gc.aBg} ${gc.aBorder} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300"}`}>
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${active ? `${gc.aIcon} text-white` : "bg-slate-100 text-slate-500"}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className={`text-sm font-semibold leading-tight ${active ? gc.aText : "text-slate-700"}`}>{o.label}</div>
                              <div className="mt-0.5 text-xs text-slate-400">{o.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Rencana Metode */}
          <div className="no-print mb-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-violet-500" />
              <h2 className="text-base font-semibold text-slate-800">Ada metode yang sudah kamu rencanakan?</h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">Opsional</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={metodePlanning}
                onChange={e => setMetodePlanning(e.target.value)}
                placeholder="Contoh: ARIMA, Random Forest, Regresi Logistik, K-Means, PCA..."
                className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-500"
              />
              {metodePlanning && (
                <button onClick={() => setMetodePlanning("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Isi ini kalau kamu sudah punya gambaran metode yang mau dipakai. Nanti output akan <span className="font-medium text-violet-700">mengevaluasi kesesuaiannya</span> dengan data dan tujuanmu.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={generate}
            disabled={!canSubmit}
            className={`no-print flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold shadow-lg transition-all ${canSubmit ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700" : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"}`}
          >
            {loading
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Menyusun peta jalan...</>
              : <><Sparkles className="h-5 w-5" /> Buatkan Peta Jalan Analisis</>
            }
          </button>
          {!canSubmit && !loading && (
            <p className="no-print mt-2 text-center text-xs text-slate-400">Pilih minimal satu jenis variabel dan satu tujuan dulu ya.</p>
          )}

          {error && (
            <div className="no-print mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div ref={resultRef} className="mt-8 space-y-4">
              <div className="no-print flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <ClipboardList className="h-5 w-5 text-indigo-500" /> Peta Jalan Analisis
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowPrint(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                    <Download className="h-3.5 w-3.5" /> Ekspor PDF
                  </button>
                  <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                    <RefreshCw className="h-3.5 w-3.5" /> Ulang
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="no-print flex rounded-xl bg-slate-100 p-1">
                {[{id:"detail",label:"Panduan Detail",Icon:ClipboardList},{id:"bagan",label:"Bagan Alur",Icon:GitBranch}].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    <t.Icon className="h-4 w-4" /> {t.label}
                  </button>
                ))}
              </div>

              {/* Detail */}
              <div className={tab === "detail" ? "space-y-4" : "hidden"}>
                {result.evaluasi_metode && <EvaluasiCard ev={result.evaluasi_metode} />}

                {result.ringkasan && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    {result.kesulitan_keseluruhan && (
                      <div className="mb-2.5 flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-medium text-indigo-700">Kesulitan keseluruhan:</span>
                        <KesulitanBadge level={result.kesulitan_keseluruhan} />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-indigo-900">{result.ringkasan}</p>
                  </div>
                )}

                {(result.tahapan || []).map((t, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                        {t.nomor || i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{t.judul}</h3>
                          <KesulitanBadge level={t.kesulitan} />
                        </div>
                        {t.deskripsi && <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.deskripsi}</p>}
                        {Array.isArray(t.metode) && t.metode.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Metode</div>
                            {t.metode.map((m, j) => {
                              if (typeof m === "string") return (
                                <span key={j} className="mr-1.5 inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{m}</span>
                              );
                              return (
                                <div key={j} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-sm font-semibold text-slate-800">{m.nama}</div>
                                  <div className="mt-2 space-y-1.5 text-xs">
                                    {m.kelebihan && <div className="flex gap-2"><span className="flex-shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">+ Kelebihan</span><span className="text-slate-600">{m.kelebihan}</span></div>}
                                    {m.kekurangan && <div className="flex gap-2"><span className="flex-shrink-0 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">− Kekurangan</span><span className="text-slate-600">{m.kekurangan}</span></div>}
                                    {m.alternatif  && <div className="flex gap-2"><span className="flex-shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700">⇄ Alternatif</span><span className="text-slate-600">{m.alternatif}</span></div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {t.alasan && (
                          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5">
                            <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                            <p className="text-xs leading-relaxed text-amber-800">{t.alasan}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {Array.isArray(result.asumsi) && result.asumsi.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-emerald-500" />
                      <h3 className="font-semibold text-slate-800">Asumsi yang perlu dicek</h3>
                    </div>
                    <ul className="space-y-2.5">
                      {result.asumsi.map((a, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span className="text-sm text-slate-600">
                            <span className="font-medium text-slate-800">{a.nama}</span>
                            {a.cara_cek && <> — {a.cara_cek}</>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.tools && (result.tools.r?.length || result.tools.python?.length) && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold text-slate-800">Tools yang disarankan</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {result.tools.r?.length > 0 && (
                        <div>
                          <span className="mb-2 inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">R</span>
                          <div className="flex flex-wrap gap-1.5">
                            {result.tools.r.map((p, i) => <span key={i} className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">{p}</span>)}
                          </div>
                        </div>
                      )}
                      {result.tools.python?.length > 0 && (
                        <div>
                          <span className="mb-2 inline-flex rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">Python</span>
                          <div className="flex flex-wrap gap-1.5">
                            {result.tools.python.map((p, i) => <span key={i} className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">{p}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bagan */}
              <div className={tab === "bagan" ? "no-print" : "hidden"}>
                <BaganAlur result={result} jenisLabels={jenisStr} tujuanLabels={tujuanStr} evaluasi={result.evaluasi_metode} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showPrint && result && (
        <PrintOverlay
          result={result}
          jenisStr={jenisStr}
          tujuanStr={tujuanStr}
          metodePlanning={metodePlanning}
          tgl={tgl}
          deskripsi={deskripsi}
          struktur={struktur}
          ukuran={ukuran}
          target={target}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  );
}
