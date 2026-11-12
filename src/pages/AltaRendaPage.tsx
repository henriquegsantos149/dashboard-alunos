import { useMemo, useState } from "react";
import { useSheetsData, getCol, allPosRows, parseDateBR } from "@/lib/sheets";
import {
  Wallet,
  Search,
  Download,
  Phone,
  Trophy,
  Gem,
  AlertCircle,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Chave "frouxa" — só letras/números, sem espaços/pontuação,
// para casar variações como "João  da Silva" vs "joao da silva."
const looseKey = (s: string) =>
  stripAccents(s).replace(/[^a-z0-9]/g, "");

const norm = (s: string) => (s || "").toLowerCase().trim();

function isAcima10k(raw: string) {
  const v = stripAccents(raw);
  return !!v && v.includes("acima");
}

function normalizePhone(raw: string) {
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}

function formatPhone(raw: string) {
  const d = normalizePhone(raw);
  if (!d) return raw;
  // Brazil with country code (12 or 13 digits, starts with 55)
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    const rest = d.slice(2);
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    const mid = num.length === 9 ? num.slice(0, 5) : num.slice(0, 4);
    const end = num.length === 9 ? num.slice(5) : num.slice(4);
    return `+55 (${ddd}) ${mid}-${end}`;
  }
  // Brazil without country code: 11 dígitos = celular (3º dígito = 9);
  // 10 dígitos = fixo (3º dígito 2-5). Caso contrário tratamos como estrangeiro.
  const isBrMobile = d.length === 11 && d[2] === "9";
  const isBrLandline = d.length === 10 && /[2-5]/.test(d[2]);
  if (isBrMobile || isBrLandline) {
    const ddd = d.slice(0, 2);
    const num = d.slice(2);
    const mid = num.length === 9 ? num.slice(0, 5) : num.slice(0, 4);
    const end = num.length === 9 ? num.slice(5) : num.slice(4);
    return `+55 (${ddd}) ${mid}-${end}`;
  }
  // Foreign number — keep digits intact, just prefix +
  return `+${d}`;
}

const CURSO_OPTIONS = [
  "Pós GGSR",
  "Pós ALPA",
  "Pós GRAC",
  "MBA IDA",
  "Pós IA.MA",
  "PAP",
  "Python GeoDev",
  "R GeoDev",
  "F2W",
  "Workshop WebGIS na Prática",
] as const;

const ORIGEM_OPTIONS = [
  "Ficha de Matrícula",
  "Ficha de Formados",
  "Ficha Alunos 10K",
  "Planilha Diamante",
  "Planilha 10K/mês",
] as const;

type OrigemFilter = "all" | (typeof ORIGEM_OPTIONS)[number];

// Retorna lista de cursos oficiais encontrados no texto livre.
// Suporta strings com múltiplos cursos (ex: "MBA IDA, PAP e F2W").
function extractCursos(raw: string): string[] {
  const v = stripAccents(raw);
  if (!v) return [];
  const out: string[] = [];
  const add = (c: string) => {
    if (!out.includes(c)) out.push(c);
  };
  if (v.includes("ggsr") || v.includes("georreferenciamento")) add("Pós GGSR");
  if (v.includes("alpa") || (v.includes("auditoria") && v.includes("licenciamento")))
    add("Pós ALPA");
  if (v.includes("grac") || v.includes("remediacao") || v.includes("contaminadas"))
    add("Pós GRAC");
  if (v.includes("mba") || v.includes("inteligencia de dados") || v.includes("ida ambient"))
    add("MBA IDA");
  if (v.includes("ia.ma") || v.includes("iama") || (v.includes("inteligencia artificial") && v.includes("meio ambiente")))
    add("Pós IA.MA");
  if (/\bpap\b/.test(v) || v.includes("programa ambiental pro")) add("PAP");
  if (v.includes("python") && (v.includes("geodev") || v.includes("geo dev") || v.includes("geo-dev")))
    add("Python GeoDev");
  else if (v.includes("python")) add("Python GeoDev");
  if (/(^|[^a-z])r\s*geo\s*dev/.test(v)) add("R GeoDev");
  else if (/(^|[ ,])r([ ,]|$)/.test(v) && (v.includes("geodev") || v.includes("python"))) add("R GeoDev");

  // Workshop WebGIS - Deve vir ANTES do teste de F2W para não classificar Workshop como F2W
  if (
    v.includes("workshop") ||
    v.includes("geoportal") ||
    v.includes("qgis ao geoportal") ||
    (v.includes("webgis") && v.includes("pratica"))
  ) {
    add("Workshop WebGIS na Prática");
  }

  // F2W só adiciona se for F2W explícito ou se não for exclusivamente o Workshop WebGIS
  if (v.includes("f2w") || (!v.includes("workshop") && (v.includes("webgis") || v.includes("webapps")))) {
    add("F2W");
  }

  return out;
}

// Colunas tolerantes a variações de cabeçalhos
const CURSO_MATRICULA_COLS = [
  "Você se matriculou em qual das nossas formações?",
  "qual das nossas formações",
  "qual das nossas formacoes",
  "formações",
  "formacoes",
  "curso",
];

const CURSO_FORMADOS_COLS = [
  "Você concluiu qual das nossas formações?",
  "qual das nossas formações",
  "qual das nossas formacoes",
  "formações",
  "formacoes",
  "curso",
];

const RENDA_COLS = [
  "Para entendermos melhor o perfil dos nossos alunos, qual faixa de renda mensal mais se aproxima da sua realidade atualmente?",
  "qual faixa de renda mensal mais se aproxima da sua realidade atualmente",
  "faixa de renda",
  "renda mensal",
  "renda",
];

const EMAIL_COLS = [
  "Qual o e-mail que você utilizou na sua matrícula?",
  "Qual o e-mail que você utilizou em sua matrícula?",
  "Qual o seu e-mail?",
  "E-mail",
  "Email",
];

const NOME_COLS = ["Qual o seu nome?", "Nome", "Aluno(a)", "Aluno"];

const PHONE_COLS = [
  "Qual o seu Whatsapp (com DDD)?",
  "Qual é o seu Whatsapp (com DDD)?",
  "Whatsapp",
  "WhatsApp",
  "Telefone",
  "Celular",
  "Contato",
];

const SUBMISSION_DATE_COLS = [
  "Submitted at",
  "Submitted At",
  "Submitted_at",
  "Submitted",
  "Submission Date",
  "Carimbo de data/hora",
  "Carimbo de data / hora",
  "Carimbo de data",
  "Timestamp",
  "Data de envio",
  "Data de preenchimento",
  "Data do preenchimento",
  "Data de Preenchimento",
  "Data do Preenchimento",
  "Data da resposta",
  "Data/Hora",
  "Data / Hora",
  "Data da Matrícula",
  "Data de Matrícula",
  "Data Matricula",
];

function parseSubmissionDate(value: string): Date | null {
  if (!value) return null;
  const s = value.trim();
  // 1. ISO format: yyyy-mm-dd (com hora opcional)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (iso) {
    const hour = iso[4] ? +iso[4] : 0;
    const min = iso[5] ? +iso[5] : 0;
    const sec = iso[6] ? +iso[6] : 0;
    return new Date(+iso[1], +iso[2] - 1, +iso[3], hour, min, sec);
  }
  // 2. BR format: dd/mm/yyyy (com hora opcional)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const hour = m[4] ? +m[4] : 0;
    const min = m[5] ? +m[5] : 0;
    const sec = m[6] ? +m[6] : 0;
    return new Date(+m[3], +m[2] - 1, +m[1], hour, min, sec);
  }
  return parseDateBR(s);
}

function extractSubmissionDate(r: Record<string, string>): Date | null {
  // 1. Match direto nas colunas conhecidas de envio de formulários
  const rawSpecific = getCol(r, SUBMISSION_DATE_COLS);
  if (rawSpecific) {
    const d = parseSubmissionDate(rawSpecific);
    if (d) return d;
  }

  // 2. Itera chaves para variações de envio de formulário, excluindo dados acadêmicos/cadastrais
  for (const [k, v] of Object.entries(r)) {
    if (!v || typeof v !== "string") continue;
    const nk = norm(k);
    if (
      nk.includes("nasciment") ||
      nk.includes("inicio") ||
      nk.includes("início") ||
      nk.includes("final") ||
      nk.includes("acesso") ||
      nk.includes("disparo")
    ) {
      continue; // ignora datas que não são de preenchimento de formulário
    }
    if (
      nk.includes("submitted") ||
      nk.includes("carimbo") ||
      nk.includes("timestamp") ||
      nk === "data de envio" ||
      nk === "data de preenchimento" ||
      nk === "data do preenchimento" ||
      nk === "data da resposta" ||
      nk === "data de matrícula" ||
      nk === "data da matrícula" ||
      nk === "data matricula"
    ) {
      const d = parseSubmissionDate(v);
      if (d) return d;
    }
  }

  return null;
}

function formatDateDisplay(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDaysAgo(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "recente";
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `há ${diffDays} dias`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return "há 1 mês";
  if (months < 12) return `há ${months} meses`;
  const years = Math.floor(diffDays / 365);
  const remMonths = Math.floor((diffDays % 365) / 30);
  if (years === 1) {
    return remMonths > 0 ? `há 1 ano e ${remMonths}m` : "há 1 ano";
  }
  return remMonths > 0 ? `há ${years} anos e ${remMonths}m` : `há ${years} anos`;
}

// Retorna "" caso o texto não corresponda a um dos cursos oficiais
function normalizeCurso(raw: string): string {
  return extractCursos(raw).join(", ");
}

// "diamante": faturou 10K em mais de um mês (planilha Diamante)
// "10k": faturou 10K em um único mês (planilha Alunos 10K/mês)
// "potencial": declarou ≥10K em alguma ficha mas NÃO está na ação
type Status = "diamante" | "10k" | "potencial";

interface Aluno {
  nome: string;
  email: string;
  telefone: string;
  curso: string;
  status: Status;
  origem: string;
  dataPreenchimento: Date | null;
  dataMatricula: Date | null;
  dataFormados: Date | null;
}

function getEffectiveDate(a: Aluno, origemFilter: OrigemFilter): Date | null {
  if (origemFilter === "Ficha de Formados" && a.dataFormados) {
    return a.dataFormados;
  }
  if (origemFilter === "Ficha de Matrícula" && a.dataMatricula) {
    return a.dataMatricula;
  }
  return a.dataPreenchimento || a.dataMatricula || a.dataFormados;
}

const STATUS_META: Record<Status, { label: string; className: string; icon: any }> = {
  diamante: {
    label: "Aluno Diamante",
    className:
      "bg-cyan-500/15 text-cyan-300 border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200",
    icon: Gem,
  },
  "10k": {
    label: "Aluno 10K/mês",
    className: "bg-primary/15 text-primary border-primary/30",
    icon: Trophy,
  },
  potencial: {
    label: "Potencial (fora da ação)",
    className: "bg-warning/15 text-warning border-warning/30",
    icon: AlertCircle,
  },
};

// Prioridade ao consolidar: Diamante > 10K > Potencial
const STATUS_RANK: Record<Status, number> = { diamante: 3, "10k": 2, potencial: 1 };

type PeriodoFilter =
  | "all"
  | "30d"
  | "60d"
  | "90d"
  | "180d"
  | "365d"
  | "mais1ano"
  | "mais2anos"
  | "sem_data";

const PERIODO_OPTIONS = [
  { value: "all", label: "Todos os períodos" },
  { value: "30d", label: "Últimos 30 dias (muito recentes)" },
  { value: "60d", label: "Últimos 60 dias" },
  { value: "90d", label: "Últimos 90 dias (3 meses)" },
  { value: "180d", label: "Últimos 6 meses" },
  { value: "365d", label: "Último 1 ano" },
  { value: "mais1ano", label: "Mais de 1 ano (veteranos)" },
  { value: "mais2anos", label: "Mais de 2 anos" },
  { value: "sem_data", label: "Sem data registrada" },
] as const;

type SortOption = "recente" | "antigo" | "nome-asc" | "nome-desc";

const SORT_OPTIONS = [
  { value: "recente", label: "Mais recentes primeiro (Data ↓)" },
  { value: "antigo", label: "Mais antigos primeiro (Data ↑)" },
  { value: "nome-asc", label: "Nome (A a Z)" },
  { value: "nome-desc", label: "Nome (Z a A)" },
] as const;

export default function AltaRendaPage() {
  const { data, isLoading } = useSheetsData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [cursoFilter, setCursoFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<OrigemFilter>("all");
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recente");

  const alunos = useMemo<Aluno[]>(() => {
    if (!data) return [];

    // Mapas auxiliares para enriquecer telefone/curso/data
    const phoneByKey = new Map<string, string>();
    const cursoByKey = new Map<string, string>();
    const dateByKey = new Map<string, Date>();

    const setFromRow = (
      r: Record<string, string>,
      emailCols: string[],
      nameCols: string[],
      phoneCols: string[],
      cursoCols: string[],
    ) => {
      const e = norm(getCol(r, emailCols));
      const n = looseKey(getCol(r, nameCols));
      const phone = getCol(r, phoneCols);
      const curso = normalizeCurso(getCol(r, cursoCols));
      const keys = [e && "e:" + e, n && "n:" + n].filter(Boolean) as string[];
      for (const k of keys) {
        if (phone && !phoneByKey.has(k)) phoneByKey.set(k, phone);
        if (curso && !cursoByKey.has(k)) cursoByKey.set(k, curso);
      }
    };

    const setDateFromRow = (r: Record<string, string>) => {
      const date = extractSubmissionDate(r);
      if (!date) return;
      const e = norm(getCol(r, EMAIL_COLS));
      const n = looseKey(getCol(r, NOME_COLS));
      const keys = [e && "e:" + e, n && "n:" + n].filter(Boolean) as string[];
      for (const k of keys) {
        if (!dateByKey.has(k)) {
          dateByKey.set(k, date);
        } else {
          // Em caso de múltiplos preenchimentos, preserva a data válida mais antiga
          const prev = dateByKey.get(k)!;
          if (date < prev) dateByKey.set(k, date);
        }
      }
    };

    // 1. Extração de datas e dados apenas das fichas oficiais de formulário
    for (const r of data.fichaMatricula) {
      setFromRow(r, EMAIL_COLS, NOME_COLS, PHONE_COLS, CURSO_MATRICULA_COLS);
      setDateFromRow(r);
    }
    for (const r of data.formados) {
      setFromRow(r, EMAIL_COLS, NOME_COLS, PHONE_COLS, CURSO_FORMADOS_COLS);
      setDateFromRow(r);
    }
    for (const r of data.fichaAlunos10k) {
      setFromRow(
        r,
        EMAIL_COLS,
        NOME_COLS,
        PHONE_COLS,
        ["Você foi (é) aluno de qual (quais) dos nossos cursos?", "Cursos", "Curso"],
      );
      setDateFromRow(r);
    }
    for (const r of data.alunosDiamante ?? [])
      setFromRow(
        r,
        ["Email", "E-mail"],
        ["Nome"],
        ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"],
        ["Cursos que fez", "Curso"],
      );
    for (const r of data.alunos10k ?? [])
      setFromRow(
        r,
        ["Email", "E-mail"],
        ["Nome"],
        ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"],
        ["Cursos que fez", "Curso"],
      );
    for (const r of allPosRows(data)) {
      const e = norm(getCol(r, ["E-mail", "Email"]));
      const n = looseKey(getCol(r, ["Aluno(a)", "Nome"]));
      const phone = getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]);
      const curso = normalizeCurso((r as any)._curso as string);
      const keys = [e && "e:" + e, n && "n:" + n].filter(Boolean) as string[];
      for (const k of keys) {
        if (phone && !phoneByKey.has(k)) phoneByKey.set(k, phone);
        if (curso && !cursoByKey.has(k)) cursoByKey.set(k, curso);
      }
    }

    // Conjuntos de chaves por nível da ação
    const diamanteKeys = new Set<string>();
    const tenKKeys = new Set<string>();
    const addList = (rs: Record<string, string>[], target: Set<string>) => {
      for (const r of rs) {
        const e = norm(getCol(r, ["Email", "E-mail"]));
        const n = looseKey(getCol(r, ["Nome"]));
        if (e) target.add("e:" + e);
        if (n) target.add("n:" + n);
      }
    };
    addList(data.alunosDiamante ?? [], diamanteKeys);
    addList(data.alunos10k ?? [], tenKKeys);

    const keysFor = (email: string, nome: string) =>
      [email && "e:" + norm(email), nome && "n:" + looseKey(nome)].filter(
        Boolean,
      ) as string[];

    const statusFor = (keys: string[]): Status => {
      if (keys.some((k) => diamanteKeys.has(k))) return "diamante";
      if (keys.some((k) => tenKKeys.has(k))) return "10k";
      return "potencial";
    };

    const lookupPhone = (keys: string[], fallback: string) => {
      for (const k of keys) {
        const p = phoneByKey.get(k);
        if (p) return p;
      }
      return fallback;
    };
    const lookupCurso = (keys: string[], fallback: string) => {
      for (const k of keys) {
        const c = cursoByKey.get(k);
        if (c) return c;
      }
      return fallback;
    };
    const lookupDate = (keys: string[]): Date | null => {
      for (const k of keys) {
        const d = dateByKey.get(k);
        if (d) return d;
      }
      return null;
    };

    const list: Aluno[] = [];
    const byEmail = new Map<string, number>();
    const byName = new Map<string, number>();

    const push = (a: Aluno) => {
      const ek = norm(a.email);
      const nk = looseKey(a.nome);
      if (!ek && !nk) return;
      let idx = -1;
      if (ek && byEmail.has(ek)) idx = byEmail.get(ek)!;
      else if (nk && byName.has(nk)) idx = byName.get(nk)!;
      if (idx >= 0) {
        const cur = list[idx];
        if (!cur.telefone && a.telefone) cur.telefone = a.telefone;
        if (!cur.curso && a.curso) cur.curso = a.curso;
        if (!cur.email && a.email) cur.email = a.email;
        if (!cur.nome && a.nome) cur.nome = a.nome;
        if (STATUS_RANK[a.status] > STATUS_RANK[cur.status]) cur.status = a.status;
        if (a.origem && !cur.origem.split(", ").includes(a.origem))
          cur.origem = cur.origem ? cur.origem + ", " + a.origem : a.origem;

        // Mesclagem de datas específicas por origem
        if (a.dataMatricula && !cur.dataMatricula) cur.dataMatricula = a.dataMatricula;
        if (a.dataFormados && !cur.dataFormados) cur.dataFormados = a.dataFormados;

        // Data geral de preenchimento / entrada: preserva a mais antiga para mostrar tempo de casa
        if (!cur.dataPreenchimento && a.dataPreenchimento) {
          cur.dataPreenchimento = a.dataPreenchimento;
        } else if (cur.dataPreenchimento && a.dataPreenchimento) {
          if (a.dataPreenchimento < cur.dataPreenchimento) {
            cur.dataPreenchimento = a.dataPreenchimento;
          }
        }

        const curEk = norm(cur.email);
        const curNk = looseKey(cur.nome);
        if (curEk && !byEmail.has(curEk)) byEmail.set(curEk, idx);
        if (curNk && !byName.has(curNk)) byName.set(curNk, idx);
        return;
      }
      const newIdx = list.length;
      list.push(a);
      if (ek) byEmail.set(ek, newIdx);
      if (nk) byName.set(nk, newIdx);
    };

    // 1. Ficha de Matrícula com renda > 10k
    for (const r of data.fichaMatricula) {
      const renda = getCol(r, RENDA_COLS);
      if (!isAcima10k(renda)) continue;
      const nome = getCol(r, NOME_COLS);
      const email = getCol(r, EMAIL_COLS);
      const phone = getCol(r, PHONE_COLS);
      const curso = normalizeCurso(getCol(r, CURSO_MATRICULA_COLS));
      const date = extractSubmissionDate(r);
      const keys = keysFor(email, nome);
      push({
        nome,
        email,
        telefone: phone || lookupPhone(keys, ""),
        curso: curso || lookupCurso(keys, ""),
        status: statusFor(keys),
        origem: "Ficha de Matrícula",
        dataPreenchimento: date || lookupDate(keys),
        dataMatricula: date,
        dataFormados: null,
      });
    }

    // 2. Formados com renda > 10k
    for (const r of data.formados) {
      const renda = getCol(r, RENDA_COLS);
      if (!isAcima10k(renda)) continue;
      const nome = getCol(r, NOME_COLS);
      const email = getCol(r, EMAIL_COLS);
      const phone = getCol(r, PHONE_COLS);
      const curso = normalizeCurso(getCol(r, CURSO_FORMADOS_COLS));
      const date = extractSubmissionDate(r);
      const keys = keysFor(email, nome);
      push({
        nome,
        email,
        telefone: phone || lookupPhone(keys, ""),
        curso: curso || lookupCurso(keys, ""),
        status: statusFor(keys),
        origem: "Ficha de Formados",
        dataPreenchimento: date || lookupDate(keys),
        dataMatricula: null,
        dataFormados: date,
      });
    }

    // 3. Ficha Alunos 10K — declararam faturamento ≥ 10K
    for (const r of data.fichaAlunos10k) {
      const nome = getCol(r, NOME_COLS);
      const email = getCol(r, EMAIL_COLS);
      const phone = getCol(r, PHONE_COLS);
      if (!nome && !email) continue;
      const date = extractSubmissionDate(r);
      const keys = keysFor(email, nome);
      push({
        nome,
        email,
        telefone: phone || lookupPhone(keys, ""),
        curso: lookupCurso(keys, ""),
        status: statusFor(keys),
        origem: "Ficha Alunos 10K",
        dataPreenchimento: date || lookupDate(keys),
        dataMatricula: null,
        dataFormados: null,
      });
    }

    // 4. Listas oficiais — Diamante
    for (const r of data.alunosDiamante ?? []) {
      const nome = getCol(r, ["Nome"]);
      const email = getCol(r, ["Email", "E-mail"]);
      if (!nome && !email) continue;
      const keys = keysFor(email, nome);
      const effectiveDate = lookupDate(keys);
      push({
        nome,
        email,
        telefone: lookupPhone(keys, ""),
        curso: lookupCurso(keys, normalizeCurso(getCol(r, ["Cursos que fez", "Curso"]))),
        status: "diamante",
        origem: "Planilha Diamante",
        dataPreenchimento: effectiveDate,
        dataMatricula: null,
        dataFormados: null,
      });
    }

    // 5. Listas oficiais — 10K/mês
    for (const r of data.alunos10k ?? []) {
      const nome = getCol(r, ["Nome"]);
      const email = getCol(r, ["Email", "E-mail"]);
      if (!nome && !email) continue;
      const keys = keysFor(email, nome);
      const effectiveDate = lookupDate(keys);
      push({
        nome,
        email,
        telefone: lookupPhone(keys, ""),
        curso: lookupCurso(keys, normalizeCurso(getCol(r, ["Cursos que fez", "Curso"]))),
        status: "10k",
        origem: "Planilha 10K/mês",
        dataPreenchimento: effectiveDate,
        dataMatricula: null,
        dataFormados: null,
      });
    }

    return list;
  }, [data]);

  const filtered = useMemo(() => {
    const q = stripAccents(query);
    const now = Date.now();

    return alunos.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (cursoFilter !== "all") {
        const cursosAluno = a.curso.split(", ").map((c) => c.trim());
        if (!cursosAluno.includes(cursoFilter) && !a.curso.includes(cursoFilter)) return false;
      }
      if (origemFilter !== "all") {
        const origens = a.origem.split(", ").map((o) => o.trim());
        const match = origens.some((o) => {
          if (o === origemFilter) return true;
          if (origemFilter === "Ficha de Formados" && (o === "Formados" || o === "Ficha de Formados")) return true;
          if (origemFilter === "Ficha de Matrícula" && (o === "Matrícula" || o === "Ficha de Matrícula")) return true;
          return false;
        });
        if (!match) return false;
      }

      const effectiveDate = getEffectiveDate(a, origemFilter);

      if (periodoFilter !== "all") {
        if (periodoFilter === "sem_data") {
          if (effectiveDate !== null) return false;
        } else {
          if (!effectiveDate) return false;
          const diffDays = Math.floor((now - effectiveDate.getTime()) / (1000 * 60 * 60 * 24));
          if (periodoFilter === "30d" && diffDays > 30) return false;
          if (periodoFilter === "60d" && diffDays > 60) return false;
          if (periodoFilter === "90d" && diffDays > 90) return false;
          if (periodoFilter === "180d" && diffDays > 180) return false;
          if (periodoFilter === "365d" && diffDays > 365) return false;
          if (periodoFilter === "mais1ano" && diffDays <= 365) return false;
          if (periodoFilter === "mais2anos" && diffDays <= 730) return false;
        }
      }

      if (!q) return true;

      const dateStr = effectiveDate ? formatDateDisplay(effectiveDate) : "";
      return (
        stripAccents(a.nome).includes(q) ||
        stripAccents(a.email).includes(q) ||
        normalizePhone(a.telefone).includes(q.replace(/\D/g, "")) ||
        stripAccents(a.curso).includes(q) ||
        stripAccents(a.origem).includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [alunos, query, statusFilter, cursoFilter, origemFilter, periodoFilter]);

  const sortedAndFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "recente") {
        const da = getEffectiveDate(a, origemFilter)?.getTime() ?? 0;
        const db = getEffectiveDate(b, origemFilter)?.getTime() ?? 0;
        if (db !== da) return db - da; // Mais recentes primeiro
        return a.nome.localeCompare(b.nome, "pt-BR");
      }
      if (sortBy === "antigo") {
        const da = getEffectiveDate(a, origemFilter)?.getTime() ?? Infinity;
        const db = getEffectiveDate(b, origemFilter)?.getTime() ?? Infinity;
        if (da !== db) return da - db; // Mais antigos primeiro
        return a.nome.localeCompare(b.nome, "pt-BR");
      }
      if (sortBy === "nome-desc") {
        return b.nome.localeCompare(a.nome, "pt-BR");
      }
      // "nome-asc"
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [filtered, sortBy, origemFilter]);

  const stats = useMemo(() => {
    const total = alunos.length;
    const diamante = alunos.filter((a) => a.status === "diamante").length;
    const tenK = alunos.filter((a) => a.status === "10k").length;
    const potencial = alunos.filter((a) => a.status === "potencial").length;
    return { total, diamante, tenK, potencial };
  }, [alunos]);

  const exportCSV = () => {
    const header = [
      "Nome",
      "Data de Preenchimento",
      "Telefone",
      "E-mail",
      "Curso",
      "Status",
      "Origem",
    ];
    const rows = sortedAndFiltered.map((a) => {
      const d = getEffectiveDate(a, origemFilter);
      return [
        a.nome,
        d ? formatDateDisplay(d) : "",
        formatPhone(a.telefone),
        a.email,
        a.curso,
        STATUS_META[a.status].label,
        a.origem,
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alunos-alta-renda-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setCursoFilter("all");
    setOrigemFilter("all");
    setPeriodoFilter("all");
    setSortBy("recente");
  };

  const toggleNameSort = () => {
    setSortBy((prev) => (prev === "nome-asc" ? "nome-desc" : "nome-asc"));
  };

  const toggleDateSort = () => {
    setSortBy((prev) => (prev === "recente" ? "antigo" : "recente"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          Alunos <span className="text-gradient-brand">Alta Renda</span>
        </h1>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard color="pink" icon={Wallet} label="Total Alta Renda" value={stats.total} loading={isLoading} />
        <StatCard
          color="primary"
          icon={Trophy}
          label="Alunos 10K/mês"
          value={stats.tenK}
          hint="Faturaram 10K em um único mês"
          loading={isLoading}
        />
        <StatCard
          color="info"
          icon={Gem}
          label="Alunos Diamante"
          value={stats.diamante}
          hint="Faturaram 10K em mais de um mês"
          loading={isLoading}
        />
        <StatCard
          color="warning"
          icon={AlertCircle}
          label="Potenciais (fora da ação)"
          value={stats.potencial}
          hint="Declararam ≥ 10K e ainda não estão na ação"
          loading={isLoading}
        />
      </section>

      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 mb-4">
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome, telefone, e-mail, data…"
              className="pl-9"
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="diamante">Aluno Diamante</SelectItem>
                <SelectItem value="10k">Aluno 10K/mês</SelectItem>
                <SelectItem value="potencial">Potenciais (fora da ação)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <Select value={origemFilter} onValueChange={(v) => setOrigemFilter(v as OrigemFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {ORIGEM_OPTIONS.map((origem) => (
                  <SelectItem key={origem} value={origem}>
                    {origem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <Select value={cursoFilter} onValueChange={setCursoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos</SelectItem>
                {CURSO_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <Select value={periodoFilter} onValueChange={(v) => setPeriodoFilter(v as PeriodoFilter)}>
              <SelectTrigger>
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIODO_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-xs text-muted-foreground">
            {sortedAndFiltered.length} de {alunos.length} alunos
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[210px] h-9 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={clearFilters} variant="ghost" size="sm" className="h-9 text-xs">
              Limpar filtros
            </Button>
            <Button onClick={exportCSV} variant="outline" size="sm" className="h-9 text-xs" disabled={!sortedAndFiltered.length}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th
                  onClick={toggleNameSort}
                  className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors group"
                  title="Clique para ordenar por nome"
                >
                  <div className="flex items-center gap-1.5">
                    Nome
                    {sortBy === "nome-asc" && <ArrowUp className="h-3.5 w-3.5 text-primary" />}
                    {sortBy === "nome-desc" && <ArrowDown className="h-3.5 w-3.5 text-primary" />}
                    {sortBy !== "nome-asc" && sortBy !== "nome-desc" && (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  onClick={toggleDateSort}
                  className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors group"
                  title="Clique para alternar entre mais recentes e mais antigos"
                >
                  <div className="flex items-center gap-1.5">
                    Data Preenchimento
                    {sortBy === "recente" && <ArrowDown className="h-3.5 w-3.5 text-primary" />}
                    {sortBy === "antigo" && <ArrowUp className="h-3.5 w-3.5 text-primary" />}
                    {sortBy !== "recente" && sortBy !== "antigo" && (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Curso</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Origem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && sortedAndFiltered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
              {sortedAndFiltered.map((a, i) => {
                const phoneDigits = normalizePhone(a.telefone);
                const waLink = phoneDigits
                  ? `https://wa.me/${phoneDigits.length <= 11 ? "55" + phoneDigits : phoneDigits}`
                  : "";
                const meta = STATUS_META[a.status];
                const Icon = meta.icon;
                const d = getEffectiveDate(a, origemFilter);
                return (
                  <tr
                    key={i}
                    className="border-t border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{a.nome || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground/90 text-xs tabular-nums inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            {formatDateDisplay(d)}
                          </span>
                          <span className="text-[10px] text-muted-foreground pl-5">
                            {formatDaysAgo(d)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {phoneDigits ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs"
                          title="Abrir no WhatsApp"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhone(a.telefone)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[240px] text-xs">
                      {a.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate max-w-[180px] text-xs">
                      {a.curso || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${meta.className}`}
                      >
                        {Icon && <Icon className="h-3 w-3" />}
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {a.origem || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
