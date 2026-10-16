import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import historicalFichas from "@/data/historicalFichas.json";

export type AlunoRow = Record<string, string>;

export interface SheetsData {
  pos: {
    ggsr: AlunoRow[];
    mba: AlunoRow[];
    alpa: AlunoRow[];
    grac: AlunoRow[];
    iama: AlunoRow[];
  };
  fichaMatricula: AlunoRow[];
  formados: AlunoRow[];
  alunos10k: AlunoRow[];
  alunosDiamante: AlunoRow[];
  fichaAlunos10k: AlunoRow[];
  fetchedAt: string;
}

export const POS_LABELS: Record<keyof SheetsData["pos"], string> = {
  ggsr: "Pós-GGSR",
  mba: "MBA",
  alpa: "Pós-ALPA",
  grac: "Pós-GRAC",
  iama: "Pós-IA.MA",
};

// --- Historical merge ------------------------------------------------------
const stripA = (s?: string) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Map any raw "curso/produto" value to a canonical bucket key so dedup works
// across live sheet, consolidated CSV export, and per-product CSVs.
function courseBucket(raw: string): string {
  const v = stripA(raw)
    .replace(/&oacute;/g, "o").replace(/&ccedil;/g, "c").replace(/&atilde;/g, "a")
    .replace(/&eacute;/g, "e").replace(/&aacute;/g, "a").replace(/&iacute;/g, "i")
    .replace(/&uacute;/g, "u");
  if (!v) return "";
  if (v.includes("pap") || v.includes("programa ambiental pro")) return "pap";
  if (v.includes("f2w") || v.includes("webgis e webapps") || v.includes("formacao 2w")) return "f2w";
  if (v.includes("geodev") || v.includes("python geodev")) return "geodev";
  if (v.includes("workshop")) return "workshop";
  if (v.includes("ggsr") || v.includes("georreferenciamento")) return "ggsr";
  if (v.includes("alpa") || v.includes("pericia")) return "alpa";
  if (v.includes("mba") || v.includes(" ida")) return "mba";
  if (v.includes("grac") || v.includes("recursos ambientais")) return "grac";
  if (v.includes("ia.ma") || v.includes("iama") || v.includes("inteligencia artificial")) return "iama";
  return v.slice(0, 32);
}

const K_EMAIL_KEYS = [
  "Qual o e-mail que você utilizou na sua matrícula?",
  "Qual o e-mail que voc? utilizou na sua matr?cula?",
];
const K_CURSO_KEYS = [
  "Você se matriculou em qual das nossas formações?",
  "Voc? se matriculou em qual das nossas forma??es?",
];

function pick(row: AlunoRow, keys: string[]): string {
  for (const k of keys) if (row[k]) return row[k];
  // loose fallback
  const nkeys = Object.keys(row);
  for (const k of keys) {
    const hit = nkeys.find((x) => stripA(x) === stripA(k));
    if (hit && row[hit]) return row[hit];
  }
  return "";
}

function mergeHistorical(liveFicha: AlunoRow[]): AlunoRow[] {
  const seen = new Set<string>();
  const out: AlunoRow[] = [];
  const keyOf = (r: AlunoRow) => {
    const email = pick(r, K_EMAIL_KEYS).trim().toLowerCase();
    const bucket = courseBucket(pick(r, K_CURSO_KEYS));
    if (!email) return `noemail::${stripA((r as any)["Qual o seu nome?"])}::${bucket}`;
    return `${email}::${bucket}`;
  };
  for (const r of liveFicha) {
    const k = keyOf(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  for (const r of historicalFichas as AlunoRow[]) {
    const k = keyOf(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function useSheetsData() {
  return useQuery({
    queryKey: ["sheets-data"],
    queryFn: async (): Promise<SheetsData> => {
      const { data, error } = await supabase.functions.invoke("sheets-data");
      if (error) throw error;
      const merged = { ...(data as SheetsData) };
      merged.fichaMatricula = mergeHistorical(merged.fichaMatricula ?? []);
      return merged;
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });
}


const norm = (s?: string) => (s ?? "").trim().toLowerCase();

export function getCol(row: AlunoRow, names: string[]): string {
  const keys = Object.keys(row);
  for (const n of names) {
    const k = keys.find((x) => norm(x) === norm(n));
    if (k && row[k]) return row[k];
  }
  for (const n of names) {
    const k = keys.find((x) => norm(x).includes(norm(n)));
    if (k && row[k]) return row[k];
  }
  return "";
}

export function parseDateBR(value: string): Date | null {
  if (!value) return null;
  const s = value.trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  // yyyy-mm-dd (parse as LOCAL date to avoid UTC shifting the day back)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  // dd-mm-yyyy
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dash) return new Date(+dash[3], +dash[2] - 1, +dash[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// Exclude PAP (Programa Ambiental Pro) students from Ficha de Matrícula.
// Dashboard considers only Pós-Graduação and MBA students.
export function fichaMatriculaPosMba(data: SheetsData): AlunoRow[] {
  return data.fichaMatricula.filter((r) => {
    const v = getCol(r, [
      "Você se matriculou em qual das nossas formações?",
      "Você se matriculou em qual das nossas formações",
      "qual das nossas formações",
    ]);
    const n = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!n) return true;
    if (n.includes("programa ambiental pro") || /\bpap\b/.test(n)) return false;
    return true;
  });
}

export function allPosRows(data: SheetsData) {
  return [
    ...data.pos.ggsr.map((r) => ({ ...r, _curso: "Pós-GGSR" })),
    ...data.pos.mba.map((r) => ({ ...r, _curso: "MBA" })),
    ...data.pos.alpa.map((r) => ({ ...r, _curso: "Pós-ALPA" })),
    ...data.pos.grac.map((r) => ({ ...r, _curso: "Pós-GRAC" })),
    ...(data.pos.iama ?? []).map((r) => ({ ...r, _curso: "Pós-IA.MA" })),
  ];
}
