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
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
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

// --- Correção de encoding e mojibake ---------------------------------------
const MOJIBAKE: [RegExp, string][] = [
  [/Ã£/g, "ã"], [/Ãµ/g, "õ"], [/Ã§/g, "ç"], [/Ã¡/g, "á"], [/Ã©/g, "é"], [/Ã­/g, "í"],
  [/Ã³/g, "ó"], [/Ãº/g, "ú"], [/Ã¢/g, "â"], [/Ãª/g, "ê"], [/Ã´/g, "ô"], [/Ã /g, "à"],
  [/Ã‡/g, "Ç"], [/Ãƒ/g, "Ã"], [/Ã•/g, "Õ"], [/Â/g, ""],
  [/&aacute;/gi, "á"], [/&eacute;/gi, "é"], [/&iacute;/gi, "í"], [/&oacute;/gi, "ó"],
  [/&uacute;/gi, "ú"], [/&atilde;/gi, "ã"], [/&otilde;/gi, "õ"], [/&ccedil;/gi, "ç"],
  [/&amp;/gi, "&"], [/&nbsp;/gi, " "],
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
  [/\bFundac\?o\b/gi, "Fundação"],
  [/\bAssoc\?o\b/gi, "Associação"],
  [/\bAmbient\?l\b/gi, "Ambiental"],
  [/\bTecnol\?gic([oa]s?)\b/gi, "Tecnológic$1"],
  [/\bAgr\?cola\b/gi, "Agrícola"],
  [/\bT\?cnic([oa]s?)\b/gi, "Técnic$1"],
  [/\bP\?s[- ]?Gradua\?\?o\b/gi, "Pós-Graduação"],
  [/\bP\?s\b/gi, "Pós"],
  [/\bAgncia\b/gi, "Agência"],
  [/\bSanitria\b/gi, "Sanitária"],
  [/\bBrbaro\b/gi, "Bárbaro"],
  [/\bB\?rbaro\b/gi, "Bárbaro"],
  [/\bJoo\b/gi, "João"],
  [/\b\?rg([aã]os?)\b/gi, "Órg$1"],
];

export function fixEncoding(raw: string): string {
  let t = raw ?? "";
  for (const [re, rep] of MOJIBAKE) t = t.replace(re, rep);
  for (const [re, rep] of PALAVRAS_ACENTO) t = t.replace(re, rep as string);
  t = t.replace(/(\p{L})\?(\p{L})/gu, "$1$2");
  t = t.replace(/\uFFFD/g, "");
  return t.replace(/\s{2,}/g, " ").trim();
}

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
  return t.length > 35 ? t.slice(0, 35).trim() + "…" : t;
}

const INVALIDOS = new Set([
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
  "atualmente em ?rgo publico", "atualmente em orgo publico",
]);

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

  // Tratar padrões como "Analista Ambiental, Prefeitura Municipal..."
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

  // Casos específicos de descrições
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
  if (
    INVALIDOS.has(s) ||
    s.startsWith("atualmente") ||
    s.startsWith("sou atualmente") ||
    s.startsWith("trabalho atualmente") ||
    s.includes("orgao publico") ||
    s.includes("orgo publico") ||
    s.includes("?rgo") ||
    s.includes("empresa publica") ||
    s.includes("iniciativa privada") ||
    s.includes("setor privado") ||
    s.includes("setor publico") ||
    s.includes("servidor publico") ||
    s.includes("funcionario publico") ||
    s.includes("nao trabalho") ||
    s.includes("sem empresa") ||
    s.includes("desempregad")
  ) {
    return { empresa: "" };
  }
  if (t.split(" ").length > 10) return { empresa: "" };

  let formatted = t
    .split(" ")
    .map((w) => (SIGLAS.test(w) && w === w.toUpperCase() ? w : titleCase(w)))
    .join(" ");

  formatted = formatted.replace(/\s+(S\/A|S\.A\.?|Sa|Ltda\.?|Me|Eireli)$/i, (m) => m.toUpperCase().replace("LTDA", "Ltda")).trim();

  // Consolidação de nomes canônicos conhecidos
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

// Lista de palavras-chave públicas (com correspondência estrita por palavra inteira)
const PUBLICO_WORDS = new Set([
  "prefeitura", "secretaria", "semad", "semma", "sema", "ibama", "icmbio", "ministerio", "instituto",
  "federal", "estadual", "municipal", "embrapa", "incra", "funai", "governo", "camara",
  "autarquia", "publico", "publica", "ufv", "ufmg", "usp", "ufrj", "ufpa", "ifpa", "iema", "inema",
  "adema", "cetesb", "igam", "ana", "dnit", "exercito", "policia", "batalhao", "crea",
  "agencia", "consorcio", "tribunal", "defesa civil", "sudam", "codevasf", "cprm", "epagri",
  "emater", "idaf", "idam", "imasul", "inpe", "naturatins", "sedam", "semas", "sisema"
]);

function isPublico(nome: string): boolean {
  const v = strip(nome);
  // Associações civis, cooperativas e entidades de classe são da iniciativa privada
  if (
    v.includes("associacao") ||
    v.includes("cooperativa") ||
    v.includes("sindicato") ||
    v.includes("produtores") ||
    v.includes("fornecedores")
  ) {
    return false;
  }
  const words = v.split(/[^a-z0-9]+/);
  return words.some((w) => PUBLICO_WORDS.has(w));
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

  // Deduplicação inteligente de aluno por E-mail -> Telefone -> Nome
  const byStudentKey = new Map<
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
    let key = "";
    if (r.email) key = `e:${r.email}`;
    else if (r.telefone) key = `p:${r.telefone.replace(/\D/g, "")}`;
    else key = `n:${strip(r.aluno).replace(/[^a-z0-9]/g, "")}`;

    const cur = byStudentKey.get(key) ?? {
      aluno: r.aluno,
      empresas: [],
      cargos: [],
      telefones: [],
      emails: [],
      cursos: new Set<string>(),
    };

    // Prioriza o nome com acentos corretos se o atual tiver caracteres truncados
    if (r.aluno && (!cur.aluno || (!cur.aluno.includes("?") && r.aluno.length > cur.aluno.length))) {
      cur.aluno = r.aluno;
    }

    if (r.empresa) cur.empresas.push(r.empresa);
    if (r.cargo && !cur.cargos.includes(r.cargo)) cur.cargos.push(r.cargo);
    if (r.telefone && !cur.telefones.includes(r.telefone)) cur.telefones.push(r.telefone);
    if (r.email && !cur.emails.includes(r.email)) cur.emails.push(r.email);
    for (const c of r.curso.split(/[,;]/).map((x) => normalizeCurso(x)).filter(Boolean)) {
      cur.cursos.add(c);
    }
    byStudentKey.set(key, cur);
  }

  // Escolhe a forma canônica da empresa
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
  for (const v of byStudentKey.values()) {
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
  const lines = ["Empresa/Órgão,Tipo,Colaborador,Cargo,É Líder/Decisor,WhatsApp,E-mail,Cursos"];
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

const PAGE_SIZE = 10;

export function B2BModule({ rows }: { rows: B2BRow[] }) {
  const [tab, setTab] = useState<"publico" | "privado" | "todos">("publico");
  const [q, setQ] = useState("");
  const [cursoFilter, setCursoFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<B2BCompanyGroup | null>(null);

  // Cursos disponíveis na base para o filtro
  const cursosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      for (const c of r.cursos) if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  // Base filtrada por tipo de instituição (Público / Privado / Todos)
  const basePorTipo = useMemo(() => {
    if (tab === "todos") return rows;
    return rows.filter((r) => r.tipo === tab);
  }, [rows, tab]);

  // Alunos individuais filtrados pela busca e curso
  const alunosFiltrados = useMemo(() => {
    const s = strip(q);
    return basePorTipo.filter((r) => {
      if (cursoFilter !== "all" && !r.cursos.includes(cursoFilter)) return false;
      if (!s) return true;
      return (
        strip(r.empresa).includes(s) ||
        strip(r.aluno).includes(s) ||
        strip(r.cargo).includes(s) ||
        strip(r.cursos.join(" ")).includes(s)
      );
    });
  }, [basePorTipo, q, cursoFilter]);

  // Agrupamento por empresa/órgão
  const empresasAgrupadas = useMemo<B2BCompanyGroup[]>(() => {
    const map = new Map<string, B2BRow[]>();
    for (const r of alunosFiltrados) {
      const cur = map.get(r.empresa) ?? [];
      cur.push(r);
      map.set(r.empresa, cur);
    }

    const groups: B2BCompanyGroup[] = [];
    for (const [empresa, alunos] of map.entries()) {
      const cursos = [...new Set(alunos.flatMap((a) => a.cursos))].sort();
      const temLider = alunos.some((a) => a.isLider);
      const cargosCount = new Map<string, number>();
      for (const a of alunos) {
        if (a.cargo) cargosCount.set(a.cargo, (cargosCount.get(a.cargo) ?? 0) + 1);
      }
      const cargosSummary = [...cargosCount.entries()]
        .map(([c, n]) => (n > 1 ? `${n}x ${c}` : c))
        .slice(0, 2)
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

    // Ordena as que têm mais alunos primeiro
    return groups.sort((a, b) => b.totalAlunos - a.totalAlunos || a.empresa.localeCompare(b.empresa, "pt-BR"));
  }, [alunosFiltrados]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const publicas = new Set(rows.filter((r) => r.tipo === "publico").map((r) => r.empresa)).size;
    const privadas = new Set(rows.filter((r) => r.tipo === "privado").map((r) => r.empresa)).size;
    const total = publicas + privadas;
    const multi = [...new Set(rows.map((r) => r.empresa))].filter(
      (emp) => rows.filter((r) => r.empresa === emp).length >= 2,
    ).length;
    return { publicas, privadas, total, multi };
  }, [rows]);

  // Separação em: Contas Corporativas (2+ alunos) vs Demais Organizações (1 aluno)
  const contasCorporativas = useMemo(() => {
    return empresasAgrupadas.filter((g) => g.totalAlunos >= 2);
  }, [empresasAgrupadas]);

  const demaisEmpresas = useMemo(() => {
    return empresasAgrupadas.filter((g) => g.totalAlunos === 1);
  }, [empresasAgrupadas]);

  // Paginação das demais empresas
  const totalDemais = demaisEmpresas.length;
  const pages = Math.max(1, Math.ceil(totalDemais / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const sliceDemais = demaisEmpresas.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. CABEÇALHO LIMPO COM NAVEGAÇÃO PRINCIPAL                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
            <Building2 className="h-5 w-5 text-primary" />
            Mapeamento B2B & Institucional
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Vínculos profissionais dos alunos da Ambiental Pro ·{" "}
            <span className="text-foreground font-semibold">{stats.total} organizações</span> mapeadas (
            <span className="text-cyan-400 font-medium">{stats.publicas} públicas</span> ·{" "}
            <span className="text-emerald-400 font-medium">{stats.privadas} privadas</span>) ·{" "}
            <span className="text-primary font-semibold">{stats.multi} contas corporativas</span> (2+ alunos).
          </p>
        </div>

        {/* Abas Superiores de Filtro por Tipo */}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as any);
            setPage(0);
          }}
          className="shrink-0"
        >
          <TabsList className="bg-muted/40 p-1 border border-border/60">
            <TabsTrigger value="publico" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" /> Órgãos Públicos ({stats.publicas})
            </TabsTrigger>
            <TabsTrigger value="privado" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" /> Empresas Privadas ({stats.privadas})
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-1.5 text-xs">
              Todas ({stats.total})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. BARRA DE CONTROLE ÚNICA (BUSCA + CURSO + EXPORTAÇÃO)            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por órgão, empresa, colaborador ou cargo..."
            className="pl-9 h-10 text-sm bg-background/50"
          />
        </div>

        <div className="w-full sm:w-[220px]">
          <Select
            value={cursoFilter}
            onValueChange={(v) => {
              setCursoFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 text-xs bg-background/50">
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

        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 shrink-0 w-full sm:w-auto"
          onClick={() => exportCSV(alunosFiltrados, `b2b-${tab}.csv`)}
          disabled={alunosFiltrados.length === 0}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. SEÇÃO PRINCIPAL: CONTAS CORPORATIVAS EM DESTAQUE (2+ ALUNOS)    */}
      {/* ------------------------------------------------------------------ */}
      {contasCorporativas.length > 0 && (
        <div className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Contas Corporativas em Destaque (2 ou mais alunos)
              </h3>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[11px] font-semibold">
                {contasCorporativas.length} organizações
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Alvos prioritários para treinamentos in-company e vendas B2B
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {contasCorporativas.map((group) => {
              const temLider = group.temLider;
              return (
                <div
                  key={group.empresa}
                  onClick={() => setSelectedCompany(group)}
                  className="group relative rounded-xl border border-border bg-card/60 p-4 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Linha superior: Nome + Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug">
                        {group.empresa}
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold px-2 py-0.5 shrink-0">
                        {group.totalAlunos} alunos
                      </Badge>
                    </div>

                    {/* Subtítulo: Tipo e Cargos */}
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mb-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        group.tipo === "publico" ? "bg-cyan-400" : "bg-emerald-400"
                      }`} />
                      <span>{group.tipo === "publico" ? "Órgão Público" : "Empresa Privada"}</span>
                      {temLider && (
                        <span className="text-warning font-medium inline-flex items-center gap-0.5">
                          · <Award className="h-3 w-3" /> com liderança
                        </span>
                      )}
                    </div>

                    {/* Preview de Colaboradores */}
                    <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      <span className="text-foreground/80 font-medium">Equipe:</span>{" "}
                      {group.alunos.map((a) => a.aluno.split(" ")[0]).join(", ")}
                    </div>

                    {/* Cursos em Tags */}
                    <div className="flex flex-wrap gap-1">
                      {group.cursos.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 bg-background/60 text-muted-foreground"
                        >
                          {c}
                        </span>
                      ))}
                      {group.cursos.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{group.cursos.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão de Ação no Card */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Ver colaboradores & contatos</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. SEÇÃO: TODAS AS DEMAIS ORGANIZAÇÕES MAPEADAS                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {contasCorporativas.length > 0 ? "Demais Organizações Mapeadas" : "Organizações Encontradas"}
            </h3>
            <span className="text-xs text-muted-foreground">
              ({demaisEmpresas.length} instituições)
            </span>
          </div>

          <span className="text-xs text-muted-foreground">
            Página {current + 1} de {pages}
          </span>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Organização</th>
                <th className="px-4 py-3 font-semibold">Colaborador(a) & Cargo</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Cursos</th>
                <th className="px-4 py-3 font-semibold text-right">Contato Direto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sliceDemais.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    Nenhuma organização encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                sliceDemais.map((group) => {
                  const aluno = group.alunos[0];
                  if (!aluno) return null;
                  const phoneDigits = aluno.telefone.replace(/\D/g, "");
                  const waLink = phoneDigits
                    ? `https://wa.me/${phoneDigits.length <= 11 ? "55" + phoneDigits : phoneDigits}`
                    : "";

                  return (
                    <tr
                      key={group.empresa}
                      className="hover:bg-muted/20 transition-colors align-middle"
                    >
                      {/* Empresa */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm">{group.empresa}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            group.tipo === "publico" ? "bg-cyan-400" : "bg-emerald-400"
                          }`} />
                          {group.tipo === "publico" ? "Órgão Público" : "Empresa Privada"}
                        </div>
                      </td>

                      {/* Aluno & Cargo */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground text-sm">{aluno.aluno}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          {aluno.cargo ? <span>{aluno.cargo}</span> : <span className="opacity-50">Cargo não informado</span>}
                          {aluno.isLider && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-[9px] py-0 px-1 ml-1 font-semibold">
                              🎖️ Líder
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Cursos */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {group.cursos.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 bg-background/50 text-muted-foreground"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Contato WhatsApp / Email */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {phoneDigits ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all hover:scale-105"
                              title="Abrir conversa no WhatsApp"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              WhatsApp
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground opacity-40">Sem telefone</span>
                          )}

                          {aluno.email && (
                            <a
                              href={`mailto:${aluno.email}`}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              title={aluno.email}
                            >
                              <Mail className="h-4 w-4" />
                            </a>
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

        {/* Paginação da Tabela */}
        {demaisEmpresas.length > PAGE_SIZE && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              Mostrando {sliceDemais.length} de {demaisEmpresas.length} organizações
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
                className="h-8 text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
                className="h-8 text-xs"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. GAVETA / MODAL DE CONTATOS DA ORGANIZAÇÃO SELECIONADA           */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6">
          <DialogHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {selectedCompany?.tipo === "publico" ? (
                    <Landmark className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <Building2 className="h-5 w-5 text-emerald-400" />
                  )}
                  {selectedCompany?.empresa}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {selectedCompany?.totalAlunos} colaboradores identificados ·{" "}
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
                      `colaboradores-${selectedCompany.empresa.toLowerCase().replace(/[^a-z0-9]/g, "-")}.csv`,
                    )
                  }
                >
                  <Download className="h-3 w-3" /> Exportar Lista
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Lista de Colaboradores com botão WhatsApp grande e direto */}
          <div className="overflow-y-auto space-y-3 py-3 pr-1 flex-1">
            {selectedCompany?.alunos.map((a, i) => {
              const phoneDigits = a.telefone.replace(/\D/g, "");
              const waLink = phoneDigits
                ? `https://wa.me/${phoneDigits.length <= 11 ? "55" + phoneDigits : phoneDigits}`
                : "";

              return (
                <div
                  key={`${a.aluno}-${i}`}
                  className="p-4 rounded-xl border border-border bg-card/60 hover:bg-muted/20 transition-colors space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{a.aluno}</span>
                        {a.isLider && (
                          <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] py-0 px-1.5 font-semibold">
                            🎖️ Tomador de Decisão / Líder
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.cargo || "Cargo não informado"}
                      </div>
                    </div>

                    {/* Botão de WhatsApp em destaque */}
                    <div className="flex items-center gap-2">
                      {phoneDigits ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all hover:scale-105"
                        >
                          <Phone className="h-3.5 w-3.5" /> Chamar no WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem telefone</span>
                      )}

                      {a.email && (
                        <a
                          href={`mailto:${a.email}`}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground border border-border hover:bg-muted/40 transition-colors"
                          title={a.email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Cursos feitos por este aluno */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Cursos realizados:</span>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {a.cursos.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/80 text-foreground font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
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
