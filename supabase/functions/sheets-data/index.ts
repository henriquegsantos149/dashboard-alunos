// Edge function: fetches all sheet tabs and returns normalized rows
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const SID_ALUNOS = "1h1J--X-ZTBdH66xj_hrNJbIt6Y2XC5Dl1trTd802ULs";
const SID_FICHAS = "1lra80TbJhAqWzOl_B5Y-NXLMIV0HVB9rQ3y5X1PtSIo";
const SID_10K = "1ko5PCWXKBV1NwEK_cndeo5l-sEUpZ1qbBjuWQm_1n-A";

// In-memory cache (per warm instance). TTL keeps Google Sheets calls low
// and absorbs transient 429/503 bursts by serving the last good payload.
const CACHE_TTL_MS = 5 * 60_000; // 5 min fresh window (poupa quota do Sheets)
const STALE_MAX_MS = 30 * 60_000; // serve stale for up to 30 min on upstream errors
let cache: { at: number; payload: unknown } | null = null;
let inflight: Promise<unknown> | null = null;
// undefined = ainda não resolvido | string = nome da aba | null = aba inexistente
let iamaTab: string | null | undefined = undefined;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function batchGet(sid: string, ranges: string[], lk: string, gk: string) {
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${sid}/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`;

  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lk}`,
        "X-Connection-Api-Key": gk,
      },
    });
    if (res.ok) return res.json();
    const status = res.status;
    lastErr = `Sheets ${sid} ${status}: ${await res.text()}`;
    // Retry only on transient errors
    if (status === 429 || status === 503 || status === 502 || status === 504) {
      const backoff = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
      await sleep(backoff);
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr);
}

function rowsToObjects(values: string[][]) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => (h ?? "").toString().trim());
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? "").toString();
    });
    return obj;
  });
}

async function fetchAll(lk: string, gk: string) {
  const [alunosRes, fichasRes, k10Res] = await Promise.all([
    batchGet(SID_ALUNOS, [
      "Pós-GGSR!A1:AE2000",
      "MBA!A1:AE2000",
      "Pós-ALPA!A1:AE2000",
      "Pós-GRAC!A1:AE2000",
    ], lk, gk),
    batchGet(SID_FICHAS, [
      "Ficha de Matrícula!A1:AZ2000",
      "Formados!A1:BZ2000",
    ], lk, gk),
    batchGet(SID_10K, [
      "Alunos 10K/mês!A1:AB2000",
      "Alunos Diamante!A1:AA2000",
      "Ficha Alunos 10K!A1:AZ2000",
    ], lk, gk),
  ]);

  // Nova pós (aba pode ainda não existir). Resolve o nome da aba UMA vez por
  // instância para não gastar quota do Sheets a cada requisição.
  let iamaRows: string[][] = [];
  if (iamaTab !== null) {
    const candidates = iamaTab ? [iamaTab] : ["Pós-IA.MA", "Pós IA.MA", "Pós-IAMA", "IA.MA"];
    let found = false;
    for (const tab of candidates) {
      try {
        const r = await batchGet(SID_ALUNOS, [`${tab}!A1:AE2000`], lk, gk);
        const v = (r as any).valueRanges?.[0]?.values;
        if (v?.length) { iamaRows = v; iamaTab = tab; found = true; break; }
      } catch (_) { /* aba inexistente ou quota */ }
    }
    if (!found && !iamaTab) iamaTab = null; // não tenta mais nesta instância
  }

  const al = (alunosRes as any).valueRanges;
  const fi = (fichasRes as any).valueRanges;
  const kk = (k10Res as any).valueRanges;

  return {
    pos: {
      ggsr: rowsToObjects(al[0]?.values ?? []),
      mba: rowsToObjects(al[1]?.values ?? []),
      alpa: rowsToObjects(al[2]?.values ?? []),
      grac: rowsToObjects(al[3]?.values ?? []),
      iama: rowsToObjects(iamaRows),
    },
    fichaMatricula: rowsToObjects(fi[0]?.values ?? []),
    formados: rowsToObjects(fi[1]?.values ?? []),
    alunos10k: rowsToObjects(kk[0]?.values ?? []),
    alunosDiamante: rowsToObjects(kk[1]?.values ?? []),
    fichaAlunos10k: rowsToObjects(kk[2]?.values ?? []),
    fetchedAt: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const lk = Deno.env.get("LOVABLE_API_KEY");
  const gk = Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!lk || !gk) {
    return new Response(JSON.stringify({ error: "Missing credentials" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();

  // Serve fresh cache
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  try {
    // Coalesce concurrent requests into a single upstream fetch
    if (!inflight) {
      inflight = fetchAll(lk, gk).finally(() => {
        inflight = null;
      });
    }
    const payload = await inflight;
    cache = { at: Date.now(), payload };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    // Fallback: serve stale cache on upstream failure so the app stays usable
    if (cache && now - cache.at < STALE_MAX_MS) {
      return new Response(JSON.stringify(cache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
