import { useMemo, useState } from "react";
import {
  Building2,
  Landmark,
  Search,
  Download,
  Phone,
  Mail,
  Flame,
  Award,
  Users,
  Briefcase,
  ExternalLink,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { getCol, allPosRows, type SheetsData } from "@/lib/sheets";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type B2BRow = {
  empresa: string;
  aluno: string;
  cargo: string;
  telefone: string;
  email: string;
  cursos: string[];
  tipo: "publico" | "privado";
  isLider: boolean;
};

export type B2BCompanyGroup = {
  empresa: string;
  tipo: "publico" | "privado";
  alunos: B2BRow[];
  totalAlunos: number;
  cursos: string[];
  temLider: boolean;
  cargosSummary: string;
};

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
  [/\bAgncia\b/gi, "Agência"],
  [/\bSanitria\b/gi, "Sanitária"],
  [/\bBrbaro\b/gi, "Bárbaro"],
  [/\bJoo\b/gi, "João"],
  [/\b\?rg([aã]os?)\b/gi, "Órg$1"],
];

export function fixEncoding(raw: string): string {
  let t = raw ?? "";
  for (const [re, rep] of MOJIBAKE) t = t.replace(re, rep);
  for (const [re, rep] of ENTIDADES) t = t.replace(re, rep);
  for (const [re, rep] of PALAVRAS_ACENTO) t = t.replace(re, rep as string);
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
  if (v.includes("alpa") || v.includes("pericia") || v.includes("auditoria")) return "Pós-ALPA";
  if (v.includes("grac") || v.includes("regularizacao") || v.includes("remediacao")) return "Pós-GRAC";
  if (v.includes("ia.ma") || v.includes("iama") || v.includes("inteligencia artificial")) return "Pós-IA.MA";
  if (v.includes("mba") || v.includes("ida ambient")) return "MBA";
  if (v.includes("pap") || v.includes("programa ambiental pro")) return "PAP";
  if (v.includes("python")) return "Python GeoDev";
  if (v.includes("r geodev") || (v.includes("geodev") && v.startsWith("r "))) return "R GeoDev";
  if (v.includes("geodev")) return "GeoDev";
  if (v.includes("workshop") || v.includes("geoportal")) return "Workshop";
  if (v.includes("f2w") || v.includes("webgis") || v.includes("webapps")) return "F2W";
  return t.length > 40 ? t.slice(0, 40).trim() + "…" : t;
}

const INVALIDOS = [
  "nao", "nao trabalho", "nenhum", "nenhuma", "autonomo", "autonoma", "n/a", "na", "-", "--",
  "sem empresa", "nao trabalho em empresa", "desempregado", "desempregada", "propria", "empresa propria",
  "nao no momento", "nao atualmente", "nao possuo", "freelancer", "estudante", "aposentado", "aposentada",
  "sim", "nao se aplica", "clt", "pj", "0", "empresa", "particular", "consultoria", "privada", "publica",
  "empresa privada", "empresa publica", "outro", "outros", "varias", "diversas", "trabalho", "atualmente",
  "servico publico", "servidor publico", "servidora publica", "funcionario publico", "funcionaria publica",
  "iniciativa privada", "setor privado", "setor publico", "prefeitura", "secretaria", "escritorio",
  "faculdade", "universidade", "orgao publico", "meio ambiente", "ambiental", "eu mesmo", "eu mesma",
  "minha empresa", "talvez", "ainda nao", "nao informado", "nd", "xxx", "teste", "desempregado no momento",
  "ainda nao trabalho", "nao trabalho no momento", "sem vinculo", "nao tenho", "nao tenho empresa",
  "atualmente em orgao publico", "atualmente em orgao", "atualmente em empresa", "orgao",
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

export function isLider(cargo: string): boolean {
  const v = strip(cargo);
  if (!v) return false;
  const terms = [
    "gerente", "diretor", "diretora", "coordenad", "supervisor", "supervisora",
    "chefe", "head", "secretari", "lider", "líder", "gestor", "gestora",
    "perito", "perita", "socio", "sócio", "socia", "sócia", "proprietari",
    "fundador", "fundadora", "ceo", "superintendente", "comandante", "presidente"
  ];
  return terms.some((t) => v.includes(t));
}

export function formatPhone(raw: string) {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    const rest = d.slice(2);
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    const mid = num.length === 9 ? num.slice(0, 5) : num.slice(0, 4);
    const end = num.length === 9 ? num.slice(5) : num.slice(4);
    return `+55 (${ddd}) ${mid}-${end}`;
  }
  if (d.length === 11) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `+${d}`;
}

function cleanEmpresaAndCargo(raw: string): { empresa: string; cargo?: string } {
  let t = fixEncoding(raw || "").replace(/\s+/g, " ").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!t) return { empresa: "" };
  if (/https?:\/\/|www\.|@/i.test(t)) return { empresa: "" };
  t = t.replace(/^(sim[,.\-–:]?\s*)+/i, "");
  t = t.replace(/^(trabalho|atuo|sou|sou atualmente|atuo como|trabalho como)\s+(na|no|em|para|pela|pelo|como)\s+/i, "");
  t = t.replace(/^(empresa|orgao|órgão|instituicao|instituição)\s*[:\-]\s*/i, "");
  t = t.replace(/^(na|no|em)\s+/i, "");

  let cargo: string | undefined = undefined;

  // Pattern: "Analista Ambiental, Prefeitura Municipal..." or "Consultor - Empresa X"
  const splitMatch = t.match(/^([A-Za-zÀ-ÿ\s]{3,35}?)[,–—\-]\s*(.+)$/);
  if (splitMatch) {
    const p1 = splitMatch[1].trim();
    const p2 = splitMatch[2].trim();
    const p1Low = strip(p1);
    const CARGO_PREFIXES = [
      "analista", "engenheiro", "engenheira", "consultor", "consultora",
      "professor", "professora", "tecnico", "tecnica", "biologo", "biologa",
      "geografo", "geografa", "geologo", "geologa", "estagiario", "estagiaria",
      "coordenador", "coordenadora", "gerente", "diretor", "diretora", "fiscal",
      "auditor", "auditora", "perito", "perita", "assistente", "auxiliar"
    ];
    if (CARGO_PREFIXES.some((c) => p1Low.startsWith(c))) {
      cargo = titleCase(p1);
      t = p2;
    }
  }

  // Frases descritivas de servidores
  if (/professor.*rede estadual.*s[aã]o paulo/i.test(t)) {
    return {
      empresa: "Secretaria da Educação do Estado de São Paulo",
      cargo: "Professor",
    };
  }
  if (/prefeitura.*ju[ií]na/i.test(t)) {
    return {
      empresa: "Prefeitura Municipal de Juína - MT",
      cargo: cargo || "Analista Ambiental",
    };
  }

  t = t.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N})\]]+$/u, "").trim();
  t = t.replace(/\s*[-–—/]\s*$/, "").replace(/\s{2,}/g, " ").trim();
  if (!t) return { empresa: "" };
  if (!/\p{L}/u.test(t)) return { empresa: "" };
  if (t.replace(/[^\p{L}]/gu, "").length < 3) return { empresa: "" };

  const s = strip(t);
  if (INVALIDOS.includes(s)) return { empresa: "" };
  if (/^(nao|ainda nao|desempregad|sem empresa|nenhum)/.test(s)) return { empresa: "" };
  if (t.split(" ").length > 10) return { empresa: "" };

  let formatted = t
    .split(" ")
    .map((w) => (SIGLAS.test(w) && w === w.toUpperCase() ? w : titleCase(w)))
    .join(" ");

  formatted = formatted.replace(/\s+(S\/A|S\.A\.?|Sa|Ltda\.?|Me|Eireli)$/i, (m) => m.toUpperCase().replace("LTDA", "Ltda")).trim();

  // Entidades públicas/privadas conhecidas para consolidação
  const fLow = strip(formatted);
  if (fLow === "icmbio" || fLow.includes("instituto chico mendes")) formatted = "ICMBio";
  else if (fLow === "ibama") formatted = "IBAMA";
  else if (fLow === "ana" || fLow === "agencia nacional de aguas") formatted = "ANA - Agência Nacional de Águas";
  else if (fLow === "embrapa") formatted = "Embrapa";
  else if (fLow === "codevasf") formatted = "Codevasf";
  else if (fLow === "cetesb") formatted = "CETESB";
  else if (fLow === "incra") formatted = "INCRA";
  else if (fLow === "epagri") formatted = "Epagri";
  else if (fLow === "iagro" || fLow.includes("defesa sanitaria animal")) formatted = "IAGRO - Defesa Sanitária Animal e Vegetal";
  else if (fLow === "cprh" || fLow.includes("meio ambiente de pernambuco")) formatted = "CPRH - Agência de Meio Ambiente de PE";
  else if (fLow.includes("caixa economica federal") || fLow === "cef") formatted = "Caixa Econômica Federal";
  else if (fLow.includes("associacao baiana dos produtores de algoda") || fLow === "abapa") formatted = "ABAPA - Associação Baiana dos Produtores de Algodão";
  else if (fLow.includes("batalhao ambiental")) formatted = "Batalhão de Polícia Militar Ambiental";

  return { empresa: formatted, cargo };
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

const CARGO_KEYS = [
  "Qual é seu cargo ou função atual?",
  "Qual seu cargo ou função atual?",
  "Cargo ou função",
  "Cargo",
  "Qual a sua atuação profissional atual?",
  "Qual alternativa melhor descreve a sua principal atuação e momento profissional hoje?",
  "principal atuação",
  "Atuação profissional",
  "Atuação",
  "Profissão",
  "Função",
  "Ocupação",
];

export function buildB2BRows(data?: SheetsData): B2BRow[] {
  if (!data) return [];
  type Raw = {
    empresa: string;
    aluno: string;
    cargo: string;
    telefone: string;
    email: string;
    curso: string;
  };
  const raws: Raw[] = [];

  const add = (
    empresaRaw: string,
    alunoRaw: string,
    cursoRaw: string,
    cargoRaw: string,
    telRaw: string,
    emailRaw: string,
  ) => {
    const { empresa, cargo: extractedCargo } = cleanEmpresaAndCargo(empresaRaw);
    const aluno = fixEncoding(alunoRaw || "").trim();
    if (!empresa || !aluno) return;

    let cargo = fixEncoding(cargoRaw || "").trim();
    if (!cargo && extractedCargo) cargo = extractedCargo;
    if (cargo && cargo.length > 40) cargo = cargo.slice(0, 40) + "…";

    raws.push({
      empresa,
      aluno,
      cargo: titleCase(cargo),
      telefone: formatPhone(telRaw),
      email: (emailRaw || "").toLowerCase().trim(),
      curso: normalizeCurso(cursoRaw),
    });
  };

  for (const r of allPosRows(data)) {
    add(
      getCol(r, ["Empresa que trabalha"]),
      getCol(r, ["Aluno(a)", "Nome do Aluno", "Nome", "Aluno"]),
      (r as any)._curso,
      getCol(r, CARGO_KEYS),
      getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]),
      getCol(r, ["E-mail", "Email"]),
    );
  }

  for (const r of data.fichaMatricula ?? []) {
    add(
      getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]),
      getCol(r, ["Qual o seu nome?", "Nome"]),
      getCol(r, ["Você se matriculou em qual das nossas formações?"]),
      getCol(r, CARGO_KEYS),
      getCol(r, ["Qual o seu Whatsapp (com DDD)?", "Whatsapp"]),
      getCol(r, ["Qual o e-mail que você utilizou na sua matrícula?", "E-mail", "Email"]),
    );
  }

  for (const r of data.formados ?? []) {
    add(
      getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]),
      getCol(r, ["Qual o seu nome?", "Nome"]),
      getCol(r, ["Você concluiu qual das nossas formações?"]),
      getCol(r, CARGO_KEYS),
      getCol(r, ["Qual é o seu Whatsapp (com DDD)?", "Whatsapp"]),
      getCol(r, ["Qual o e-mail que você utilizou em sua matrícula?", "E-mail", "Email"]),
    );
  }

  for (const r of data.fichaAlunos10k ?? []) {
    add(
      getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]),
      getCol(r, ["Qual o seu nome?", "Nome"]),
      getCol(r, ["Você foi (é) aluno de qual (quais) dos nossos cursos?"]),
      getCol(r, CARGO_KEYS),
      getCol(r, ["Qual o seu Whatsapp (com DDD)?", "Whatsapp"]),
      getCol(r, ["Qual o seu e-mail?", "Email", "E-mail"]),
    );
  }

  for (const r of data.alunos10k ?? []) {
    add(
      getCol(r, ["Empresa que trabalha"]),
      getCol(r, ["Nome"]),
      getCol(r, ["Cursos que fez"]),
      getCol(r, CARGO_KEYS),
      getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular"]),
      getCol(r, ["Email", "E-mail"]),
    );
  }

  // Agrupa por aluno (nome e email unificados)
  const byAluno = new Map<
    string,
    {
      aluno: string;
      empresas: string[];
      cargos: string[];
      telefones: string[];
      emails: string[];
      cursos: Set<string>;
    }
  >();

  for (const r of raws) {
    const key = strip(r.aluno).replace(/\s+/g, " ");
    if (!key) continue;
    const cur = byAluno.get(key) ?? {
      aluno: r.aluno,
      empresas: [],
      cargos: [],
      telefones: [],
      emails: [],
      cursos: new Set<string>(),
    };
    if (r.empresa) cur.empresas.push(r.empresa);
    if (r.cargo && !cur.cargos.includes(r.cargo)) cur.cargos.push(r.cargo);
    if (r.telefone && !cur.telefones.includes(r.telefone)) cur.telefones.push(r.telefone);
    if (r.email && !cur.emails.includes(r.email)) cur.emails.push(r.email);
    for (const c of r.curso.split(/[,;]/).map((x) => normalizeCurso(x)).filter(Boolean)) {
      cur.cursos.add(c);
    }
    byAluno.set(key, cur);
  }

  const canonicalEmpresa = (list: string[]): string => {
    const counts = new Map<string, { nome: string; n: number }>();
    for (const e of list) {
      const k = strip(e);
      const hit = counts.get(k);
      if (hit) hit.n++;
      else counts.set(k, { nome: e, n: 1 });
    }
    const uniq = [...counts.values()].sort((a, b) => b.n - a.n || b.nome.length - a.nome.length);
    if (!uniq.length) return "";
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
    if (!empresa) continue;
    const cargo = v.cargos[0] || "";
    out.push({
      empresa,
      aluno: v.aluno,
      cargo,
      telefone: v.telefones[0] || "",
      email: v.emails[0] || "",
      cursos: [...v.cursos].sort((a, b) => a.localeCompare(b, "pt-BR")),
      tipo: isPublico(empresa) ? "publico" : "privado",
      isLider: isLider(cargo),
    });
  }

  return out.sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
}

function exportCSV(rows: B2BRow[], filename: string) {
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Empresa/Órgão,Tipo,Aluno,Cargo,É Líder/Decisor,WhatsApp,E-mail,Cursos"];
  for (const r of rows) {
    lines.push(
      [
        esc(r.empresa),
        esc(r.tipo === "publico" ? "Órgão Público" : "Empresa Privada"),
        esc(r.aluno),
        esc(r.cargo),
        esc(r.isLider ? "Sim" : "Não"),
        esc(r.telefone),
        esc(r.email),
        esc(r.cursos.join(", ")),
      ].join(","),
    );
  }
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
  const [tab, setTab] = useState<"publico" | "privado" | "todos">("publico");
  const [viewMode, setViewMode] = useState<"empresa" | "aluno">("empresa");
  const [q, setQ] = useState("");
  const [cursoFilter, setCursoFilter] = useState<string>("all");
  const [somenteMulti, setSomenteMulti] = useState(false);
  const [somenteLideres, setSomenteLideres] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<B2BCompanyGroup | null>(null);

  // Lista de todos os cursos presentes na base B2B para o filtro
  const cursosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      for (const c of r.cursos) if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  // Base filtrada por tipo (Público / Privado / Todos)
  const basePorTipo = useMemo(() => {
    if (tab === "todos") return rows;
    return rows.filter((r) => r.tipo === tab);
  }, [rows, tab]);

  // Alunos individuais filtrados
  const alunosFiltrados = useMemo(() => {
    const s = strip(q);
    return basePorTipo.filter((r) => {
      if (cursoFilter !== "all" && !r.cursos.includes(cursoFilter)) return false;
      if (somenteLideres && !r.isLider) return false;
      if (!s) return true;
      return (
        strip(r.empresa).includes(s) ||
        strip(r.aluno).includes(s) ||
        strip(r.cargo).includes(s) ||
        strip(r.cursos.join(" ")).includes(s)
      );
    });
  }, [basePorTipo, q, cursoFilter, somenteLideres]);

  // Empresas agrupadas com base nos filtros
  const empresasAgrupadas = useMemo<B2BCompanyGroup[]>(() => {
    const map = new Map<string, B2BRow[]>();
    for (const r of alunosFiltrados) {
      const cur = map.get(r.empresa) ?? [];
      cur.push(r);
      map.set(r.empresa, cur);
    }

    const groups: B2BCompanyGroup[] = [];
    for (const [empresa, alunos] of map.entries()) {
      if (somenteMulti && alunos.length < 2) continue;

      const cursos = [...new Set(alunos.flatMap((a) => a.cursos))].sort();
      const temLider = alunos.some((a) => a.isLider);
      const cargosCount = new Map<string, number>();
      for (const a of alunos) {
        if (a.cargo) cargosCount.set(a.cargo, (cargosCount.get(a.cargo) ?? 0) + 1);
      }
      const cargosSummary = [...cargosCount.entries()]
        .map(([c, n]) => (n > 1 ? `${n}x ${c}` : c))
        .slice(0, 3)
        .join(", ");

      groups.push({
        empresa,
        tipo: alunos[0]?.tipo ?? "privado",
        alunos,
        totalAlunos: alunos.length,
        cursos,
        temLider,
        cargosSummary,
      });
    }

    // Ordena por quantidade de alunos decrescente, depois por nome
    return groups.sort((a, b) => b.totalAlunos - a.totalAlunos || a.empresa.localeCompare(b.empresa, "pt-BR"));
  }, [alunosFiltrados, somenteMulti]);

  // Top empresas para os pills rápidos
  const topEmpresas = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of basePorTipo) {
      map.set(r.empresa, (map.get(r.empresa) ?? 0) + 1);
    }
    return [...map.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [basePorTipo]);

  // KPIs de topo do bloco
  const stats = useMemo(() => {
    const totalAlunos = basePorTipo.length;
    const empresasUnicas = new Set(basePorTipo.map((r) => r.empresa)).size;
    const empresasMulti = [...new Set(basePorTipo.map((r) => r.empresa))].filter(
      (emp) => basePorTipo.filter((r) => r.empresa === emp).length >= 2,
    ).length;
    const totalLideres = basePorTipo.filter((r) => r.isLider).length;
    return { totalAlunos, empresasUnicas, empresasMulti, totalLideres };
  }, [basePorTipo]);

  // Paginação conforme modo ativo
  const totalItems = viewMode === "empresa" ? empresasAgrupadas.length : alunosFiltrados.length;
  const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const sliceEmpresas = empresasAgrupadas.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const sliceAlunos = alunosFiltrados.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5 space-y-5">
      {/* Header do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Mapeamento B2B & Institucional
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inteligência de vínculos profissionais dos alunos da Ambiental Pro.
          </p>
        </div>

        {/* Abas de Tipo: Órgãos Públicos / Empresas Privadas / Todos */}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as any);
            setPage(0);
          }}
        >
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="publico" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" /> Órgãos Públicos
              <span className="text-[10px] bg-background/60 px-1.5 py-0.2 rounded-full font-semibold">
                {rows.filter((r) => r.tipo === "publico").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="privado" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" /> Empresas Privadas
              <span className="text-[10px] bg-background/60 px-1.5 py-0.2 rounded-full font-semibold">
                {rows.filter((r) => r.tipo === "privado").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-1.5 text-xs">
              Todos ({rows.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mini KPIs B2B */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Organizações Mapeadas
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground tabular-nums">
            {stats.empresasUnicas}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5">
          <div className="text-xs text-primary flex items-center gap-1.5 font-medium">
            <Flame className="h-3.5 w-3.5 text-primary" />
            Contas com 2+ Alunos
          </div>
          <div className="text-2xl font-bold mt-1 text-primary tabular-nums">
            {stats.empresasMulti}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-warning/20 bg-warning/5">
          <div className="text-xs text-warning flex items-center gap-1.5 font-medium">
            <Award className="h-3.5 w-3.5 text-warning" />
            Líderes / Decisores
          </div>
          <div className="text-2xl font-bold mt-1 text-warning tabular-nums">
            {stats.totalLideres}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Alunos com Vínculo
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground tabular-nums">
            {stats.totalAlunos}
          </div>
        </div>
      </div>

      {/* Top Pills de Organizações (Clicáveis para filtrar) */}
      {topEmpresas.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Principais Contas Corporativas / Órgãos (clique para filtrar):
          </div>
          <div className="flex flex-wrap gap-2">
            {topEmpresas.map(([nome, n]) => {
              const isActive = q.toLowerCase() === nome.toLowerCase();
              return (
                <button
                  key={nome}
                  onClick={() => {
                    setQ(isActive ? "" : nome);
                    setPage(0);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    isActive
                      ? "border-primary bg-primary/20 text-primary font-semibold"
                      : "border-border bg-background/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{nome}</span> ·{" "}
                  <span className="font-semibold text-primary">{n} alunos</span>
                </button>
              );
            })}
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground"
              >
                Limpar busca ({q})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de Filtros & Ações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Campo de Busca */}
        <div className="relative sm:col-span-2 lg:col-span-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar empresa, aluno, cargo ou curso…"
            className="pl-9 h-9"
          />
        </div>

        {/* Filtro por Curso */}
        <div className="sm:col-span-1 lg:col-span-3">
          <Select
            value={cursoFilter}
            onValueChange={(v) => {
              setCursoFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filtrar por Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {cursosDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modo de Visualização: Empresas vs Alunos */}
        <div className="sm:col-span-1 lg:col-span-3 flex items-center justify-start lg:justify-center">
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              setViewMode(v as any);
              setPage(0);
            }}
            className="w-full"
          >
            <TabsList className="w-full bg-muted/50 p-0.5 h-9 grid grid-cols-2">
              <TabsTrigger value="empresa" className="text-xs">
                Por Empresa ({empresasAgrupadas.length})
              </TabsTrigger>
              <TabsTrigger value="aluno" className="text-xs">
                Por Aluno ({alunosFiltrados.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Botão de Exportação */}
        <div className="sm:col-span-2 lg:col-span-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 gap-1.5"
            onClick={() => exportCSV(alunosFiltrados, `b2b-${tab}-${viewMode}.csv`)}
            disabled={alunosFiltrados.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros Rápidos (Chips de Multi-Alunos e Líderes) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground">Filtros rápidos:</span>

        <button
          onClick={() => {
            setSomenteMulti(!somenteMulti);
            setPage(0);
          }}
          className={`text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
            somenteMulti
              ? "border-primary bg-primary/20 text-primary font-semibold"
              : "border-border bg-background/50 text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <Flame className="h-3.5 w-3.5 text-primary" />
          Apenas contas com 2+ alunos ({stats.empresasMulti})
        </button>

        <button
          onClick={() => {
            setSomenteLideres(!somenteLideres);
            setPage(0);
          }}
          className={`text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
            somenteLideres
              ? "border-warning bg-warning/20 text-warning font-semibold"
              : "border-border bg-background/50 text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <Award className="h-3.5 w-3.5 text-warning" />
          Apenas Líderes / Tomadores de Decisão ({stats.totalLideres})
        </button>

        {(somenteMulti || somenteLideres || cursoFilter !== "all" || q) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSomenteMulti(false);
              setSomenteLideres(false);
              setCursoFilter("all");
              setQ("");
              setPage(0);
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODO 1: TABELA POR EMPRESA / ÓRGÃO (AGRUPADA)                       */}
      {/* =================================================================== */}
      {viewMode === "empresa" && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3.5 py-2.5 font-medium">Empresa / Órgão</th>
                <th className="px-3 py-2.5 font-medium text-center">Alunos</th>
                <th className="px-3.5 py-2.5 font-medium hidden md:table-cell">Cargos Mapeados</th>
                <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Cursos</th>
                <th className="px-3 py-2.5 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {sliceEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma organização encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sliceEmpresas.map((group) => {
                  const isHot = group.totalAlunos >= 2;
                  return (
                    <tr
                      key={group.empresa}
                      className="border-t border-border hover:bg-muted/30 align-middle transition-colors cursor-pointer"
                      onClick={() => setSelectedCompany(group)}
                    >
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {group.empresa}
                          </span>
                          {group.tipo === "publico" ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                              Público
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                              Privado
                            </Badge>
                          )}
                          {isHot && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Flame className="h-3 w-3" /> Conta Quente
                            </Badge>
                          )}
                          {group.temLider && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Award className="h-3 w-3" /> Líder
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs ${
                          isHot ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {group.totalAlunos}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-[280px] truncate">
                        {group.cargosSummary || "—"}
                      </td>

                      <td className="px-3 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {group.cursos.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/50 text-muted-foreground"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1 text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCompany(group);
                          }}
                        >
                          <Users className="h-3.5 w-3.5" />
                          Ver Alunos ({group.totalAlunos})
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODO 2: TABELA POR ALUNO (LISTAGEM DETALHADA)                       */}
      {/* =================================================================== */}
      {viewMode === "aluno" && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3.5 py-2.5 font-medium">Empresa / Órgão</th>
                <th className="px-3.5 py-2.5 font-medium">Aluno</th>
                <th className="px-3.5 py-2.5 font-medium hidden sm:table-cell">Cargo / Função</th>
                <th className="px-3.5 py-2.5 font-medium">Contato</th>
                <th className="px-3.5 py-2.5 font-medium hidden lg:table-cell">Cursos</th>
              </tr>
            </thead>
            <tbody>
              {sliceAlunos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhum aluno encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sliceAlunos.map((r, i) => {
                  const phoneDigits = r.telefone.replace(/\D/g, "");
                  const waLink = phoneDigits
                    ? `https://wa.me/${phoneDigits.length <= 11 ? "55" + phoneDigits : phoneDigits}`
                    : "";

                  return (
                    <tr key={`${r.aluno}-${i}`} className="border-t border-border hover:bg-muted/30 align-middle">
                      <td className="px-3.5 py-2.5">
                        <div className="font-medium text-foreground text-sm">{r.empresa}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.tipo === "publico" ? "Órgão Público" : "Empresa Privada"}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 font-medium text-foreground text-sm">
                        {r.aluno}
                      </td>

                      <td className="px-3.5 py-2.5 hidden sm:table-cell text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-muted-foreground">{r.cargo || "—"}</span>
                          {r.isLider && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] py-0 px-1.5">
                              🎖️ Líder / Decisor
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          {phoneDigits ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                              title="Abrir no WhatsApp"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {r.telefone}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {r.email && (
                            <a
                              href={`mailto:${r.email}`}
                              className="text-muted-foreground hover:text-foreground inline-flex items-center"
                              title={r.email}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 hidden lg:table-cell">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span>
          {totalItems} {viewMode === "empresa" ? "organizações" : "alunos"} · página {current + 1} de {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DIALOG: ALUNOS DA EMPRESA SELECIONADA                               */}
      {/* =================================================================== */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {selectedCompany?.tipo === "publico" ? (
                    <Landmark className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <Building2 className="h-5 w-5 text-emerald-400" />
                  )}
                  {selectedCompany?.empresa}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedCompany?.totalAlunos} aluno{selectedCompany?.totalAlunos === 1 ? "" : "s"} vinculado{selectedCompany?.totalAlunos === 1 ? "" : "s"} ·{" "}
                  {selectedCompany?.tipo === "publico" ? "Órgão Público" : "Empresa Privada"}
                </DialogDescription>
              </div>

              {selectedCompany && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() =>
                    exportCSV(
                      selectedCompany.alunos,
                      `alunos-${selectedCompany.empresa.toLowerCase().replace(/[^a-z0-9]/g, "-")}.csv`,
                    )
                  }
                >
                  <Download className="h-3 w-3" /> Exportar CSV
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto space-y-3 py-2 pr-1 flex-1">
            {selectedCompany?.alunos.map((a, i) => {
              const phoneDigits = a.telefone.replace(/\D/g, "");
              const waLink = phoneDigits
                ? `https://wa.me/${phoneDigits.length <= 11 ? "55" + phoneDigits : phoneDigits}`
                : "";

              return (
                <div
                  key={`${a.aluno}-${i}`}
                  className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-muted/20 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{a.aluno}</span>
                      {a.cargo && (
                        <span className="text-xs text-muted-foreground">({a.cargo})</span>
                      )}
                      {a.isLider && (
                        <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] py-0 px-1.5 flex items-center gap-1">
                          🎖️ Líder / Decisor
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {phoneDigits && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          <Phone className="h-3 w-3" /> Falar no WhatsApp
                        </a>
                      )}
                      {a.email && (
                        <a
                          href={`mailto:${a.email}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Mail className="h-3 w-3" /> E-mail
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Cursos:
                    </span>
                    {a.cursos.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/70 text-foreground font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
