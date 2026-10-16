import { useMemo, useState } from "react";
import { Building2, Landmark, Search, Download } from "lucide-react";
import { getCol, allPosRows, type SheetsData } from "@/lib/sheets";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type B2BRow = { empresa: string; aluno: string; cursos: string[]; tipo: "publico" | "privado" };

const strip = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// --- Correção de encoding (mojibake / "?" no lugar de acentos) --------------
const ENTIDADES: [RegExp, string][] = [
  [/&aacute;/gi, "á"], [/&eacute;/gi, "é"], [/&iacute;/gi, "í"], [/&oacute;/gi, "ó"],
  [/&uacute;/gi, "ú"], [/&atilde;/gi, "ã"], [/&otilde;/gi, "õ"], [/&ccedil;/gi, "ç"],
  [/&acirc;/gi, "â"], [/&ecirc;/gi, "ê"], [/&ocirc;/gi, "ô"], [/&agrave;/gi, "à"],
  [/&amp;/gi, "&"], [/&nbsp;/gi, " "],
];

const MOJIBAKE: [RegExp, string][] = [
  [/Ã£/g, "ã"], [/Ãµ/g, "õ"], [/Ã§/g, "ç"], [/Ã¡/g, "á"], [/Ã©/g, "é"], [/Ã­/g, "í"],
  [/Ã³/g, "ó"], [/Ãº/g, "ú"], [/Ã¢/g, "â"], [/Ãª/g, "ê"], [/Ã´/g, "ô"], [/Ã /g, "à"],
  [/Ã‡/g, "Ç"], [/Ãƒ/g, "Ã"], [/Ã•/g, "Õ"], [/Â/g, ""],
];

// Palavras comuns em PT-BR que chegam com "?" no lugar do acento.
const PALAVRAS_ACENTO: [RegExp, string][] = [
  [/\bN\?o\b/g, "Não"], [/\bn\?o\b/g, "não"],
  [/\bS\?o\b/g, "São"], [/\bs\?o\b/g, "são"],
  [/\bP\?blic([oa]s?)\b/g, "Públic$1"],
  [/\bp\?blic([oa]s?)\b/g, "públic$1"],
  [/\bA\?\?o\b/g, "Ação"], [/\ba\?\?o\b/g, "ação"],
  [/\bA\?\?es\b/g, "Ações"], [/\ba\?\?es\b/g, "ações"],
  [/\bSa\?de\b/gi, "Saúde"],
  [/\bEduca\?\?o\b/gi, "Educação"],
  [/\bGest\?o\b/gi, "Gestão"],
  [/\bFunda\?\?o\b/gi, "Fundação"],
  [/\bAssocia\?\?o\b/gi, "Associação"],
  [/\bServi\?os?\b/gi, "Serviço"],
  [/\bMunic\?pio\b/gi, "Município"],
  [/\bEstadu\?l\b/gi, "Estadual"],
  [/\bAmbient\?l\b/gi, "Ambiental"],
  [/\bInform\?tica\b/gi, "Informática"],
  [/\bTecnol\?gic([oa]s?)\b/gi, "Tecnológic$1"],
  [/\bCi\?ncias?\b/gi, "Ciências"],
  [/\bEnergi\?\b/gi, "Energia"],
  [/\bConstru\?\?o\b/gi, "Construção"],
  [/\bProdu\?\?o\b/gi, "Produção"],
  [/\bRegi\?o\b/gi, "Região"],
  [/\bJos\?\b/gi, "José"],
  [/\bAnt\?nio\b/gi, "Antônio"],
  [/\bMar\?a\b/gi, "Maria"],
  [/\bAgr\?cola\b/gi, "Agrícola"],
  [/\bAn\?lises?\b/gi, "Análise"],
  [/\bB\?sic([oa])\b/gi, "Básic$1"],
  [/\bT\?cnic([oa]s?)\b/gi, "Técnic$1"],
  [/\bP\?s[- ]?Gradua\?\?o\b/gi, "Pós-Graduação"],
  [/\bP\?s\b/gi, "Pós"],
];

export function fixEncoding(raw: string): string {
  let t = raw ?? "";
  for (const [re, rep] of MOJIBAKE) t = t.replace(re, rep);
  for (const [re, rep] of ENTIDADES) t = t.replace(re, rep);
  for (const [re, rep] of PALAVRAS_ACENTO) t = t.replace(re, rep as string);
  // "?" residual colado entre letras (ex: "Comun?dade") — remove o marcador
  t = t.replace(/(\p{L})\?(\p{L})/gu, "$1$2");
  t = t.replace(/\uFFFD/g, "");
  return t.replace(/\s{2,}/g, " ").trim();
}

// --- Padronização de nomes de cursos ---------------------------------------
export function normalizeCurso(raw: string): string {
  const t = fixEncoding(raw || "");
  const v = strip(t);
  if (!v) return "";
  if (v.includes("ggsr") || v.includes("georreferenciamento")) return "Pós-GGSR";
  if (v.includes("alpa") || v.includes("pericia")) return "Pós-ALPA";
  if (v.includes("grac") || v.includes("regularizacao")) return "Pós-GRAC";
  if (v.includes("ia.ma") || v.includes("iama") || v.includes("inteligencia artificial")) return "Pós-IA.MA";
  if (v.includes("mba")) return "MBA";
  if (v.includes("pap") || v.includes("programa ambiental pro")) return "PAP";
  if (v.includes("python")) return "Python GeoDev";
  if (v.includes("r geodev") || (v.includes("geodev") && v.startsWith("r "))) return "R GeoDev";
  if (v.includes("geodev")) return "GeoDev";
  if (v.includes("f2w") || v.includes("webgis")) return "F2W";
  if (v.includes("workshop")) return "Workshop";
  return t.length > 40 ? t.slice(0, 40).trim() + "…" : t;
}

const INVALIDOS = [
  "nao", "nao trabalho", "nenhum", "nenhuma", "autonomo", "autonoma", "n/a", "na", "-", "--",
  "sem empresa", "nao trabalho em empresa", "desempregado", "desempregada", "propria", "empresa propria",
  "nao no momento", "nao atualmente", "nao possuo", "freelancer", "estudante", "aposentado", "aposentada",
  "sim", "nao se aplica", "clt", "pj", "0", "empresa", "particular", "consultoria", "privada", "publica",
  "empresa privada", "empresa publica", "outro", "outros", "varias", "diversas", "trabalho", "atualmente",
  "servico publico", "iniciativa privada", "prefeitura", "secretaria", "escritorio", "faculdade",
  "universidade", "orgao publico", "meio ambiente", "ambiental", "eu mesmo", "eu mesma", "minha empresa",
  "talvez", "ainda nao", "nao informado", "nd", "xxx", "teste", "desempregado no momento",
  "ainda nao trabalho", "nao trabalho no momento", "sem vinculo", "nao tenho", "nao tenho empresa",
];

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "a", "o", "no", "na"]);
const SIGLAS = /^[A-Z0-9&./-]{2,6}$/;

function titleCase(t: string): string {
  return t
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && MINUSCULAS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function cleanEmpresa(raw: string): string {
  let t = fixEncoding(raw || "").replace(/\s+/g, " ").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!t) return "";
  if (/https?:\/\/|www\.|@/i.test(t)) return "";
  t = t.replace(/^(sim[,.\-–:]?\s*)+/i, "");
  t = t.replace(/^(trabalho|atuo|sou)\s+(na|no|em|para|pela|pelo|como)\s+/i, "");
  t = t.replace(/^(empresa|orgao|órgão|instituicao|instituição)\s*[:\-]\s*/i, "");
  t = t.replace(/^(na|no|em)\s+/i, "");
  t = t.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N})\]]+$/u, "").trim();
  t = t.replace(/\s*[-–—/]\s*$/, "").replace(/\s{2,}/g, " ").trim();
  if (!t) return "";
  if (!/\p{L}/u.test(t)) return "";
  if (t.replace(/[^\p{L}]/gu, "").length < 3) return "";
  if (INVALIDOS.includes(strip(t))) return "";
  if (/^(nao|ainda nao|desempregad|sem empresa|nenhum)/.test(strip(t))) return "";
  if (t.split(" ").length > 10) return "";
  const formatted = t
    .split(" ")
    .map((w) => (SIGLAS.test(w) && w === w.toUpperCase() ? w : titleCase(w)))
    .join(" ");
  return formatted.replace(/\s+(S\/A|S\.A\.?|Sa|Ltda\.?|Me|Eireli)$/i, (m) => m.toUpperCase().replace("LTDA", "Ltda")).trim();
}

const PUBLICO_KEYS = [
  "prefeitura", "secretaria", "semad", "semma", "sema ", "ibama", "icmbio", "ministerio", "instituto",
  "federal", "estadual", "municipal", "universidade", "embrapa", "incra", "funai", "governo", "camara",
  "autarquia", "publico", "publica", "ufv", "ufmg", "usp", "ufrj", "ufpa", "ifpa", "if ", "iema", "inema",
  "adema", "cetesb", "igam", "ana ", "dnit", "exercito", "policia", "batalhao", "conselho", "crea",
  "fundacao", "agencia", "consorcio", "tribunal", "defesa civil", "sudam", "codevasf", "cprm", "epagri",
  "emater", "idaf", "idam", "imasul", "inpe", "naturatins", "sedam", "semas", "sisema", "escola",
];

function isPublico(nome: string): boolean {
  const v = " " + strip(nome) + " ";
  return PUBLICO_KEYS.some((k) => v.includes(k));
}

export function buildB2BRows(data?: SheetsData): B2BRow[] {
  if (!data) return [];
  type Raw = { empresa: string; aluno: string; curso: string };
  const raws: Raw[] = [];
  const add = (empresaRaw: string, alunoRaw: string, cursoRaw: string) => {
    const empresa = cleanEmpresa(empresaRaw);
    const aluno = fixEncoding(alunoRaw || "").trim();
    if (!empresa || !aluno) return;
    raws.push({ empresa, aluno, curso: normalizeCurso(cursoRaw) });
  };

  for (const r of allPosRows(data)) {
    add(getCol(r, ["Empresa que trabalha"]), getCol(r, ["Aluno(a)", "Nome do Aluno", "Nome"]), (r as any)._curso);
  }
  for (const r of data.fichaMatricula ?? []) {
    add(
      getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]),
      getCol(r, ["Qual o seu nome?", "Nome"]),
      getCol(r, ["Você se matriculou em qual das nossas formações?"]),
    );
  }
  for (const r of data.formados ?? []) {
    add(
      getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]),
      getCol(r, ["Qual o seu nome?", "Nome"]),
      getCol(r, ["Você concluiu qual das nossas formações?"]),
    );
  }
  for (const r of data.fichaAlunos10k ?? []) {
    add(
      getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]),
      getCol(r, ["Qual o seu nome?", "Nome"]),
      getCol(r, ["Você foi (é) aluno de qual (quais) dos nossos cursos?"]),
    );
  }
  for (const r of data.alunos10k ?? []) {
    add(getCol(r, ["Empresa que trabalha"]), getCol(r, ["Nome"]), getCol(r, ["Cursos que fez"]));
  }

  // Agrupa por aluno (nome normalizado)
  const byAluno = new Map<string, { aluno: string; empresas: string[]; cursos: Set<string> }>();
  for (const r of raws) {
    const key = strip(r.aluno).replace(/\s+/g, " ");
    if (!key) continue;
    const cur = byAluno.get(key) ?? { aluno: r.aluno, empresas: [], cursos: new Set<string>() };
    cur.empresas.push(r.empresa);
    for (const c of r.curso.split(/[,;]/).map((x) => normalizeCurso(x)).filter(Boolean)) cur.cursos.add(c);
    byAluno.set(key, cur);
  }

  // Escolhe uma empresa canônica: variantes que se contêm são a mesma empresa
  const canonicalEmpresa = (list: string[]): string => {
    const counts = new Map<string, { nome: string; n: number }>();
    for (const e of list) {
      const k = strip(e);
      const hit = counts.get(k);
      if (hit) hit.n++;
      else counts.set(k, { nome: e, n: 1 });
    }
    const uniq = [...counts.values()].sort((a, b) => b.n - a.n || b.nome.length - a.nome.length);
    // agrupa variantes contidas umas nas outras
    const chosen = uniq[0];
    for (const c of uniq) {
      const a = strip(c.nome);
      const b = strip(chosen.nome);
      if (a !== b && (a.includes(b) || b.includes(a)) && c.nome.length > chosen.nome.length) {
        chosen.nome = c.nome;
      }
    }
    return chosen.nome;
  };

  const out: B2BRow[] = [];
  for (const v of byAluno.values()) {
    const empresa = canonicalEmpresa(v.empresas);
    out.push({
      empresa,
      aluno: v.aluno,
      cursos: [...v.cursos].sort((a, b) => a.localeCompare(b, "pt-BR")),
      tipo: isPublico(empresa) ? "publico" : "privado",
    });
  }

  return out.sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
}

function exportCSV(rows: B2BRow[], filename: string) {
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Empresa/Órgão,Aluno,Cursos"];
  for (const r of rows) lines.push([esc(r.empresa), esc(r.aluno), esc(r.cursos.join(", "))].join(","));
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 12;

export function B2BModule({ rows }: { rows: B2BRow[] }) {
  const [tab, setTab] = useState<"publico" | "privado">("publico");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const base = useMemo(() => rows.filter((r) => r.tipo === tab), [rows, tab]);
  const filtered = useMemo(() => {
    const s = strip(q);
    if (!s) return base;
    return base.filter(
      (r) =>
        strip(r.empresa).includes(s) ||
        strip(r.aluno).includes(s) ||
        strip(r.cursos.join(" ")).includes(s),
    );
  }, [base, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const topEmpresas = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of base) {
      if (!cleanEmpresa(r.empresa)) continue;
      map.set(r.empresa, (map.get(r.empresa) ?? 0) + 1);
    }
    return [...map.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [base]);

  return (
    <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Mapeamento B2B & Institucional
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Onde nossos alunos trabalham — {rows.length} alunos com vínculo identificado (
            {rows.filter((r) => r.tipo === "publico").length} públicos ·{" "}
            {rows.filter((r) => r.tipo === "privado").length} privados).
          </p>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as any);
            setPage(0);
          }}
        >
          <TabsList className="bg-muted/50">
            <TabsTrigger value="publico" className="gap-1.5">
              <Landmark className="h-3.5 w-3.5" /> Órgãos Públicos
            </TabsTrigger>
            <TabsTrigger value="privado" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Empresas Privadas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {topEmpresas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topEmpresas.map(([nome, n]) => (
            <span
              key={nome}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background/40 text-muted-foreground"
            >
              <span className="text-foreground font-medium">{nome}</span> · {n}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar empresa, aluno ou curso…"
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9"
          onClick={() => exportCSV(filtered, `b2b-${tab}.csv`)}
          disabled={filtered.length === 0}
        >
          <Download className="h-3.5 w-3.5" /> Exportar (.CSV)
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Empresa / Órgão</th>
              <th className="px-3 py-2 font-medium">Aluno</th>
              <th className="px-3 py-2 font-medium">Cursos</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              slice.map((r, i) => (
                <tr key={`${r.aluno}-${i}`} className="border-t border-border hover:bg-muted/30 align-top">
                  <td className="px-3 py-2 font-medium">{r.empresa}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.aluno}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.cursos.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        r.cursos.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/50 text-muted-foreground"
                          >
                            {c}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} aluno{filtered.length === 1 ? "" : "s"} · página {current + 1} de {pages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            Próxima
          </Button>
        </div>
      </div>
    </section>
  );
}
