import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  Instagram,
  Youtube,
  Search,
  Users,
  Music2,
  Facebook,
  Linkedin,
  Mail,
  Megaphone,
  MoreHorizontal,
  Building2,
  Landmark,
  GraduationCap,
  Briefcase,
  UserRound,
  Trophy,
  TrendingUp,
  DollarSign,
  Gift,
  Clock,
  Minus,
  Wrench,
  Video,
  Headphones,
  Presentation,
  BookOpen,
  FileText,
  Monitor,
  Target,
  Star,
  Rocket,
  ArrowUpRight,
  Sparkles,
  HandCoins,
  Pause,
  type LucideIcon,
} from "lucide-react";
import {
  useSheetsData,

  allPosRows,
  getCol,
  parseDateBR,
  daysSince,
  POS_LABELS,
  fichaMatriculaPosMba,
} from "@/lib/sheets";
import { ChartCard } from "@/components/Charts";
import { B2BModule, buildB2BRows } from "@/components/B2BModule";
import { PALETTE, CURSO_COLORS as SHARED_CURSO_COLORS, SCALE_QUALITY, ATUACAO_COLORS, TIPO_INST_COLORS } from "@/lib/chartColors";
import oldFormDataRaw from "@/data/oldForm.json";

const oldFormData = oldFormDataRaw as Record<string, string>[];

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const ATUACAO_OPTIONS = [
  "Autônomo / Consultor (PJ)",
  "Estagiário",
  "Trainee",
  "Profissional Contratado (Nível Júnior ou Pleno)",
  "Profissional Contratado (Nível Sênior ou Especialista)",
  "Servidor Público",
  "Estudante",
  "Outro",
];

const ATUACAO_SHORT: Record<string, string> = {
  "Autônomo / Consultor (PJ)": "Autônomo/PJ",
  "Estagiário": "Estagiário",
  "Trainee": "Trainee",
  "Profissional Contratado (Nível Júnior ou Pleno)": "Júnior/Pleno",
  "Profissional Contratado (Nível Sênior ou Especialista)": "Sênior/Esp.",
  "Servidor Público": "Servidor Pub.",
  "Estudante": "Estudante",
  "Outro": "Outro",
};

const RENDA_OPTIONS = [
  "Até R$ 2.000",
  "De R$ 2.000 a R$ 4.000",
  "De R$ 4.000 a R$ 7.000",
  "De R$ 7.000 a R$ 10.000",
  "Acima de R$ 10.000",
];

function matchRenda(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "";
  if (v.includes("ate r$ 2") || v.includes("ate 2")) return "Até R$ 2.000";
  if (v.includes("2.000 a r$ 4") || v.includes("2000 a 4")) return "De R$ 2.000 a R$ 4.000";
  if (v.includes("4.000 a r$ 7") || v.includes("4000 a 7")) return "De R$ 4.000 a R$ 7.000";
  if (v.includes("7.000 a r$ 10") || v.includes("7000 a 10")) return "De R$ 7.000 a R$ 10.000";
  if (v.includes("acima")) return "Acima de R$ 10.000";
  return "";
}

function matchAtuacao(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "";
  if (v.includes("autonom") || v.includes("consultor") || /\bpj\b/.test(v)) return "Autônomo / Consultor (PJ)";
  if (v.includes("estagi")) return "Estagiário";
  if (v.includes("trainee")) return "Trainee";
  if (v.includes("servidor") || v.includes("publico")) return "Servidor Público";
  if (v.includes("estudante")) return "Estudante";
  if (v.includes("senior") || v.includes("especialista")) return "Profissional Contratado (Nível Sênior ou Especialista)";
  if (v.includes("junior") || v.includes("pleno") || v.includes("contratado") || v.includes("clt")) return "Profissional Contratado (Nível Júnior ou Pleno)";
  return "Outro";
}

const CURSO_COLORS = SHARED_CURSO_COLORS;

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatYm(k: string) {
  const [y, m] = k.split("-");
  return `${m}/${y.slice(2)}`;
}

const ENG_BUCKETS: { label: string; test: (d: number) => boolean; color: string }[] = [
  { label: "0–7 dias", test: (d) => d <= 7, color: SCALE_QUALITY[0] },
  { label: "8–15 dias", test: (d) => d > 7 && d <= 15, color: SCALE_QUALITY[1] },
  { label: "16–30 dias", test: (d) => d > 15 && d <= 30, color: SCALE_QUALITY[2] },
  { label: "31–60 dias", test: (d) => d > 30 && d <= 60, color: SCALE_QUALITY[3] },
  { label: "60+ dias", test: (d) => d > 60, color: SCALE_QUALITY[4] },
];

type Period = "14d" | "30d" | "6m" | "12m" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  "14d": "Últimas 2 semanas",
  "30d": "Último mês",
  "6m": "Últimos 6 meses",
  "12m": "Últimos 12 meses",
  all: "Todo o período",
};

function dKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatD(k: string) {
  const [, m, dd] = k.split("-");
  return `${dd}/${m}`;
}

export default function InsightsPage() {
  const { data, isLoading } = useSheetsData();
  const [period, setPeriod] = useState<Period>("12m");
  const [cursoAval, setCursoAval] = useState<string>("all");
  const [cursoImpacto, setCursoImpacto] = useState<string>("all");
  const [cursoEng, setCursoEng] = useState<string>("all");
  const [detail, setDetail] = useState<{ title: string; subtitle: string; students: { nome: string; telefone: string }[] } | null>(null);

  const b2bRows = useMemo(() => buildB2BRows(data), [data]);


  const pos = useMemo(() => (data ? allPosRows(data) : []), [data]);

  // 1. Matrículas — agrupado por dia (períodos curtos) ou mês (longos)
  const timeline = useMemo(() => {
    const cursos = Object.values(POS_LABELS);
    const now = new Date();
    let from: Date | null = null;
    const useDaily = period === "14d" || period === "30d";
    if (period === "14d") from = new Date(now.getTime() - 14 * 86400000);
    else if (period === "30d") from = new Date(now.getTime() - 30 * 86400000);
    else if (period === "6m") {
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (period === "12m") {
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    const byKey = new Map<string, Record<string, number>>();
    for (const r of pos) {
      const d = parseDateBR(getCol(r, ["Data de Início"]));
      if (!d) continue;
      const y = d.getFullYear();
      if (y < 2018 || y > now.getFullYear() + 1) continue;
      if (from && d < from) continue;
      if (d > now) continue;
      const k = useDaily ? dKey(d) : ymKey(d);
      const curso = (r as any)._curso as string;
      if (!byKey.has(k)) {
        const init: Record<string, number> = { __total: 0 };
        cursos.forEach((c) => (init[c] = 0));
        byKey.set(k, init);
      }
      const obj = byKey.get(k)!;
      obj[curso] = (obj[curso] ?? 0) + 1;
      obj.__total = (obj.__total ?? 0) + 1;
    }
    const sorted = Array.from(byKey.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([k, v]) => ({ ym: k, label: useDaily ? formatD(k) : formatYm(k), ...v }));
  }, [pos, period]);

  // 2. Engajamento — apenas alunos ativos, segmentado por curso
  const engajamento = useMemo(() => {
    type Student = { nome: string; telefone: string; curso: string; faixa: string };
    const cursos = Object.values(POS_LABELS);
    const counts = ENG_BUCKETS.map((b) => {
      const obj: Record<string, any> = { name: b.label, color: b.color, __total: 0 };
      cursos.forEach((c) => (obj[c] = 0));
      return obj;
    });
    const students: Student[][] = ENG_BUCKETS.map(() => []);
    const allStudents: Student[] = [];
    let total = 0;

    // Phone lookup from fichas/formados
    const norm = (s: string) => s.toLowerCase().trim();
    const phoneByKey = new Map<string, string>();
    if (data) {
      const fichas = [...data.fichaMatricula, ...data.formados, ...oldFormData];
      for (const r of fichas) {
        const phone = getCol(r, [
          "Qual o seu Whatsapp (com DDD)?",
          "Qual é o seu Whatsapp (com DDD)?",
          "Qual o seu WhatsApp?",
          "Qual o seu telefone?",
          "Telefone (WhatsApp)",
          "Whatsapp",
          "WhatsApp",
          "Telefone",
          "Celular",
          "Contato",
        ]).trim();
        if (!phone) continue;
        const e = norm(getCol(r, ["Qual o e-mail que você utilizou na sua matrícula?", "E-mail", "Email"]));
        const n = norm(getCol(r, ["Qual o seu nome?", "Nome", "Aluno(a)"]));
        if (e && !phoneByKey.has("e:" + e)) phoneByKey.set("e:" + e, phone);
        if (n && !phoneByKey.has("n:" + n)) phoneByKey.set("n:" + n, phone);
      }
    }

    for (const r of pos) {
      const curso = (r as any)._curso as string;
      if (cursoEng !== "all" && curso !== cursoEng) continue;
      const status = stripAccents(getCol(r, ["Status de Matrícula"]));
      const isActive = status === "ativa" || status.includes("pre-confirm") || status.includes("preconfirm");
      if (!isActive) continue;
      const d = daysSince(parseDateBR(getCol(r, ["Último Acesso"])));
      if (d === null) continue;
      const idx = ENG_BUCKETS.findIndex((b) => b.test(d));
      if (idx < 0) continue;
      counts[idx][curso] = (counts[idx][curso] ?? 0) + 1;
      counts[idx].__total += 1;
      total += 1;
      const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]).trim() || "(sem nome)";
      const phoneDirect = getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]).trim();
      const e = norm(getCol(r, ["E-mail", "Email"]));
      const n = norm(nome);
      const telefone = phoneDirect || (e && phoneByKey.get("e:" + e)) || (n && phoneByKey.get("n:" + n)) || "";
      const s: Student = { nome, telefone, curso, faixa: ENG_BUCKETS[idx].label };
      students[idx].push(s);
      allStudents.push(s);
    }
    return { data: counts, total, students, allStudents };
  }, [pos, cursoEng, data]);


  // 3. Heatmap Renda × Atuação
  const heatmap = useMemo(() => {
    if (!data) return { matrix: [] as { renda: string; cells: { atuacao: string; value: number }[] }[], max: 0 };

    // Build per-student lookup of renda + atuacao via fichas
    const norm = (s: string) => s.toLowerCase().trim();
    const fichas = [...data.fichaMatricula, ...data.formados, ...oldFormData];

    // map key -> { renda, atuacao }
    const profile = new Map<string, { renda?: string; atuacao?: string }>();
    const setVal = (key: string, field: "renda" | "atuacao", value: string) => {
      if (!key || !value) return;
      const cur = profile.get(key) ?? {};
      if (!cur[field]) {
        cur[field] = value;
        profile.set(key, cur);
      }
    };
    for (const r of fichas) {
      const e = norm(getCol(r, ["Qual o e-mail que você utilizou na sua matrícula?", "E-mail", "Email"]));
      const n = norm(getCol(r, ["Qual o seu nome?", "Nome"]));
      const renda = matchRenda(getCol(r, [
        "Para entendermos melhor o perfil dos nossos alunos, qual faixa de renda mensal mais se aproxima da sua realidade atualmente?",
        "faixa de renda",
      ]));
      const atu = matchAtuacao(getCol(r, [
        "Qual alternativa melhor descreve a sua principal atuação e momento profissional hoje?",
        "principal atuação",
        "Atuação",
      ]));
      if (e) {
        if (renda) setVal("e:" + e, "renda", renda);
        if (atu) setVal("e:" + e, "atuacao", atu);
      }
      if (n) {
        if (renda) setVal("n:" + n, "renda", renda);
        if (atu) setVal("n:" + n, "atuacao", atu);
      }
    }

    // Mark 10K students as "Acima de R$ 10.000"
    const tenK = new Set<string>();
    for (const r of [...(data.alunos10k ?? []), ...(data.alunosDiamante ?? [])]) {
      const e = norm(getCol(r, ["Email", "E-mail"]));
      const n = norm(getCol(r, ["Nome"]));
      if (e) tenK.add("e:" + e);
      if (n) tenK.add("n:" + n);
    }

    // Initialize matrix
    const counts: Record<string, Record<string, number>> = {};
    for (const r of RENDA_OPTIONS) {
      counts[r] = {};
      for (const a of ATUACAO_OPTIONS) counts[r][a] = 0;
    }

    const seen = new Set<string>();
    for (const row of pos) {
      const e = norm(getCol(row, ["E-mail", "Email"]));
      const n = norm(getCol(row, ["Aluno(a)", "Nome"]));
      const sig = (e ? "e:" + e : "") + "|" + (n ? "n:" + n : "");
      if (seen.has(sig)) continue;
      seen.add(sig);

      let renda = "";
      let atuacao = "";
      const ek = e ? "e:" + e : "";
      const nk = n ? "n:" + n : "";
      const p = profile.get(ek) ?? profile.get(nk);
      if (p) {
        renda = p.renda ?? "";
        atuacao = p.atuacao ?? "";
      }
      // also try atuação from pos itself
      if (!atuacao) {
        atuacao = matchAtuacao(getCol(row, ["Atuação", "Atuação Profissional"]));
      }
      // 10K override
      if ((ek && tenK.has(ek)) || (nk && tenK.has(nk))) renda = "Acima de R$ 10.000";

      if (!renda || !atuacao) continue;
      if (!counts[renda] || counts[renda][atuacao] === undefined) continue;
      counts[renda][atuacao] += 1;
    }

    let max = 0;
    const matrix = RENDA_OPTIONS.map((renda) => ({
      renda,
      cells: ATUACAO_OPTIONS.map((atuacao) => {
        const value = counts[renda][atuacao];
        if (value > max) max = value;
        return { atuacao, value };
      }),
    }));
    return { matrix, max };
  }, [data, pos]);

  // 4. Top empregadores + tipo de instituição (das fichas)
  const empregadores = useMemo(() => {
    const empty = { top: [] as { name: string; value: number }[], tipos: [] as { name: string; value: number; color: string }[], total: 0 };
    if (!data) return empty;
    const fichas = [...data.fichaMatricula, ...data.formados, ...data.fichaAlunos10k];
    const byPerson = new Map<string, string>();
    for (const r of fichas) {
      const empresa = getCol(r, ["Você trabalha em alguma empresa? Se sim, qual?"]).trim();
      if (!empresa) continue;
      const e = stripAccents(getCol(r, ["Qual o e-mail que você utilizou na sua matrícula?", "Qual o e-mail que você utilizou em sua matrícula?", "Qual o seu e-mail?"]));
      const n = stripAccents(getCol(r, ["Qual o seu nome?"]));
      const key = e || n;
      if (!key) continue;
      if (!byPerson.has(key)) byPerson.set(key, empresa);
    }
    const isNoneAnswer = (s: string) => {
      const v = stripAccents(s).replace(/[.\s]/g, "");
      return ["nao", "n", "naotrabalho", "nenhuma", "nenhum", "naoseaplica", "na", "-", "naotenho", "semempresa", "desempregado", "desempregada", "autonomo", "autonoma", "freelancer", "freela"].includes(v);
    };
    const counts = new Map<string, number>();
    const pretty = new Map<string, string>();
    const tipoCounts: Record<string, number> = { "Pública (Federal/Estadual)": 0, "Pública (Municipal)": 0, "Privada": 0, "Academia/Pesquisa": 0, "Autônomo/Sem vínculo": 0 };
    for (const empresa of byPerson.values()) {
      if (isNoneAnswer(empresa)) {
        tipoCounts["Autônomo/Sem vínculo"]++;
        continue;
      }
      const norm = empresa.replace(/\s+/g, " ").trim();
      const k = stripAccents(norm).replace(/[.,]/g, "");
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (!pretty.has(k)) pretty.set(k, norm);
      const v = stripAccents(empresa);
      if (/prefeitura|municip/.test(v)) tipoCounts["Pública (Municipal)"]++;
      else if (/governo|estad|secretaria|federal|ibama|icmbio|\bana\b|funai|incra|embrapa|inema|cetesb|inea|imasul|naturatins|\bsema\b|idema|inpe|funasa|ministerio/.test(v))
        tipoCounts["Pública (Federal/Estadual)"]++;
      else if (/universidade|faculdade|instituto federal|\bif[a-z]{2,3}\b|\bu[fe][a-z]{1,3}\b|fundacao|pesquisa|cnpq|capes/.test(v)) tipoCounts["Academia/Pesquisa"]++;
      else tipoCounts["Privada"]++;
    }
    const top = Array.from(counts.entries())
      .map(([k, v]) => ({ name: pretty.get(k) ?? k, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
    const TIPO_COLORS = TIPO_INST_COLORS;
    const tipos = Object.entries(tipoCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: TIPO_COLORS[name] }));
    const total = tipos.reduce((s, t) => s + t.value, 0);
    return { top, tipos, total };
  }, [data]);

  // 5. Canal de aquisição (fichas de matrícula)
  const canais = useMemo(() => {
    if (!data) return [] as { name: string; value: number; color: string }[];
    const counts = new Map<string, number>();
    for (const r of data.fichaMatricula) {
      const raw = getCol(r, ["Como você conheceu a Ambiental Pro?"]).trim();
      if (!raw) continue;
      const v = stripAccents(raw);
      let cat = "Outros";
      if (/instagram|insta\b/.test(v)) cat = "Instagram";
      else if (/youtube|\byt\b/.test(v)) cat = "YouTube";
      else if (/google|busca|pesquis/.test(v)) cat = "Google";
      else if (/indica|amigo|colega|conhecid/.test(v)) cat = "Indicação";
      else if (/tiktok/.test(v)) cat = "TikTok";
      else if (/facebook|\bfb\b/.test(v)) cat = "Facebook";
      else if (/linkedin/.test(v)) cat = "LinkedIn";
      else if (/email|e-mail|newsletter/.test(v)) cat = "E-mail";
      else if (/anuncio|propaganda|\bad\b/.test(v)) cat = "Anúncio pago";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    // usa paleta unificada
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }));
  }, [data]);

  // 6. Objetivos ao se capacitar (ficha de matrícula — multi-select por vírgula)
  const objetivos = useMemo(() => {
    if (!data) return [] as { name: string; value: number; color: string }[];
    const counts = new Map<string, number>();
    for (const r of data.fichaMatricula) {
      const raw = getCol(r, ["Qual é o seu objetivo ao se capacitar na Ambiental Pro?"]).trim();
      if (!raw) continue;
      const parts = raw.split(/,(?=\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g).map((s) => s.trim()).filter(Boolean);
      const items = parts.length ? parts : [raw];
      for (const it of items) {
        const clean = it.replace(/\.$/, "").trim();
        if (!clean) continue;
        counts.set(clean, (counts.get(clean) ?? 0) + 1);
      }
    }
    // usa paleta unificada
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }));
  }, [data]);

  // 7. Avaliação do curso (ficha de Formados)
  const avaliacao = useMemo(() => {
    const empty = { geral: [] as { name: string; value: number; color: string }[], medias: [] as { name: string; value: number }[], total: 0, mediaGlobal: 0 };
    if (!data) return empty;
    const GERAL_ORDER = ["Excelente", "Bom", "Regular", "Ruim", "Péssimo"];
    const GERAL_COLOR: Record<string, string> = {
      "Excelente": SCALE_QUALITY[0],
      "Bom": SCALE_QUALITY[1],
      "Regular": SCALE_QUALITY[2],
      "Ruim": SCALE_QUALITY[3],
      "Péssimo": SCALE_QUALITY[4],
    };
    const geralCount: Record<string, number> = {};
    const dims = [
      "Qualidade dos vídeos",
      "Qualidade dos áudios",
      "Didática dos professores",
      "Profundidade dos temas",
      "Materiais complementares",
      "Facilidade de uso da plataforma",
      "Aplicabilidade prática no mercado",
    ];
    const sums: Record<string, { sum: number; n: number }> = {};
    dims.forEach((d) => (sums[d] = { sum: 0, n: 0 }));
    let total = 0;
    const matchCurso = (raw: string) => {
      const v = stripAccents(raw);
      if (v.includes("georreferenciamento")) return "Pós-GGSR";
      if (v.includes("auditoria") || v.includes("licenciamento") || v.includes("pericia")) return "Pós-ALPA";
      if (v.includes("mba") || v.includes("inteligencia de dados")) return "MBA";
      if (v.includes("gestao de recursos") || v.includes("grac")) return "Pós-GRAC";
      return "";
    };
    for (const r of data.formados) {
      if (cursoAval !== "all") {
        const c = matchCurso(getCol(r, ["Você concluiu qual das nossas formações?"]));
        if (c !== cursoAval) continue;
      }
      const g = getCol(r, ["Qual a sua avaliação geral em relação ao curso?"]).trim();
      if (g) {
        const match = GERAL_ORDER.find((o) => stripAccents(o) === stripAccents(g)) ?? g;
        geralCount[match] = (geralCount[match] ?? 0) + 1;
        total++;
      }
      for (const d of dims) {
        const v = parseFloat((getCol(r, [d]) || "").replace(",", "."));
        if (!isNaN(v) && v > 0 && v <= 5) {
          sums[d].sum += v;
          sums[d].n += 1;
        }
      }
    }
    const geral = GERAL_ORDER.filter((o) => geralCount[o]).map((name) => ({
      name,
      value: geralCount[name],
      color: GERAL_COLOR[name],
    }));
    const medias = dims.map((d) => ({
      name: d,
      value: sums[d].n > 0 ? +(sums[d].sum / sums[d].n).toFixed(2) : 0,
    }));
    const dimsCount = medias.filter((m) => m.value > 0).length;
    const totalSum = medias.reduce((s, m) => s + m.value, 0);
    const mediaGlobal = dimsCount ? +(totalSum / dimsCount).toFixed(2) : 0;
    return { geral, medias, total, mediaGlobal };
  }, [data, cursoAval]);

  // 8. Impacto na carreira (ficha de Formados)
  const impacto = useMemo(() => {
    type Student = { nome: string; telefone: string };
    const empty = {
      profissional: [] as { name: string; value: number; color: string }[],
      financeiro: [] as { name: string; value: number; color: string }[],
      profStudents: {} as Record<string, Student[]>,
      finStudents: {} as Record<string, Student[]>,
    };
    if (!data) return empty;
    const profCount = new Map<string, number>();
    const finCount = new Map<string, number>();
    const profStudents: Record<string, Student[]> = {};
    const finStudents: Record<string, Student[]> = {};
    const shorten = (s: string): string | null => {
      const v = stripAccents(s);
      if (v.includes("ainda nao percebi")) return "Ainda não percebi mudanças significativas";
      if (v.includes("novos projetos") || v.includes("novas responsabilidades") || v.includes("responsabilidades tecnicas")) return "Novos projetos / responsabilidades";
      if (v.includes("proprio negocio") || v.includes("negocio proprio") || v.includes("iniciei negocio")) return "Iniciei negócio próprio";
      if (v.includes("mudei de empresa")) return "Mudei de empresa (cargo maior)";
      if (v.includes("promoc") || v.includes("promov") || v.includes("fui promovid")) return "Fui promovido(a)";
      return "Outro";
    };
    const shortenFin = (s: string) => {
      const v = stripAccents(s);
      if (v.includes("aumento salarial")) return "Aumento salarial direto";
      if (v.includes("novos beneficios") || v.includes("auxilio")) return "Novos benefícios";
      if (v.includes("autonomia tecnica")) return "+ Autonomia técnica (sem $)";
      if (v.includes("processo de negocia")) return "Em negociação";
      if (v.includes("nao houve alterac")) return "Sem alteração";
      return s.length > 60 ? s.slice(0, 57) + "…" : s;
    };
    const matchCursoImp = (raw: string) => {
      const v = stripAccents(raw);
      if (v.includes("georreferenciamento")) return "Pós-GGSR";
      if (v.includes("auditoria") || v.includes("licenciamento") || v.includes("pericia")) return "Pós-ALPA";
      if (v.includes("mba") || v.includes("inteligencia de dados")) return "MBA";
      if (v.includes("gestao de recursos") || v.includes("grac")) return "Pós-GRAC";
      return "";
    };
    for (const r of data.formados) {
      if (cursoImpacto !== "all") {
        const c = matchCursoImp(getCol(r, ["Você concluiu qual das nossas formações?"]));
        if (c !== cursoImpacto) continue;
      }
      const nome = getCol(r, ["Qual o seu nome?", "Nome", "Aluno(a)"]).trim();
      const telefone = getCol(r, [
        "Qual o seu telefone?",
        "Qual o seu WhatsApp?",
        "Telefone (WhatsApp)",
        "WhatsApp",
        "Telefone",
        "Celular",
      ]).trim();
      const student: Student = { nome: nome || "(sem nome)", telefone };
      const p = getCol(r, ["Qual foi o principal impacto da Pós-Graduação na sua trajetória profissional até o momento?"]).trim();
      if (p) {
        const k = shorten(p);
        if (k) {
          profCount.set(k, (profCount.get(k) ?? 0) + 1);
          (profStudents[k] ||= []).push(student);
        }
      }
      const f = getCol(r, ["A conclusão da Pós-Graduação resultou em algum tipo de reconhecimento financeiro ou novos benefícios em sua carreira?"]).trim();
      if (f) {
        const k = shortenFin(f);
        finCount.set(k, (finCount.get(k) ?? 0) + 1);
        (finStudents[k] ||= []).push(student);
      }
    }
    const toArr = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }));
    return { profissional: toArr(profCount), financeiro: toArr(finCount), profStudents, finStudents };
  }, [data, cursoImpacto]);

  const CANAL_ICONS: Record<string, LucideIcon> = {
    Instagram: Instagram, YouTube: Youtube, Google: Search, Indicação: Users,
    TikTok: Music2, Facebook: Facebook, LinkedIn: Linkedin, "E-mail": Mail,
    "Anúncio pago": Megaphone, Outros: MoreHorizontal,
  };
  const TIPO_ICONS: Record<string, LucideIcon> = {
    "Pública (Federal/Estadual)": Landmark,
    "Pública (Municipal)": Building2,
    "Privada": Briefcase,
    "Academia/Pesquisa": GraduationCap,
    "Autônomo/Sem vínculo": UserRound,
  };
  const FIN_ICONS: Record<string, LucideIcon> = {
    "Aumento salarial direto": DollarSign,
    "Novos benefícios": Gift,
    "+ Autonomia técnica (sem $)": Wrench,
    "Em negociação": Clock,
    "Sem alteração": Minus,
  };
  const CRITERIO_META: Record<string, { icon: LucideIcon; color: string }> = {
    "Qualidade dos vídeos": { icon: Video, color: "hsl(202 45% 62%)" },
    "Qualidade dos áudios": { icon: Headphones, color: "hsl(263 34% 68%)" },
    "Didática dos professores": { icon: Presentation, color: "hsl(150 38% 58%)" },
    "Profundidade dos temas": { icon: BookOpen, color: "hsl(38 48% 62%)" },
    "Materiais complementares": { icon: FileText, color: "hsl(176 30% 55%)" },
    "Facilidade de uso da plataforma": { icon: Monitor, color: "hsl(224 38% 68%)" },
    "Aplicabilidade prática no mercado": { icon: Target, color: "hsl(22 45% 62%)" },
  };
  const IMP_ICONS: Record<string, LucideIcon> = {
    "Fui promovido(a)": ArrowUpRight,
    "Mudei de empresa (cargo maior)": Rocket,
    "Novos projetos/responsabilidades": Sparkles,
    "Iniciei negócio próprio": HandCoins,
    "Primeiro emprego/estágio": Trophy,
    "Ainda não percebi mudanças": Pause,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          <span className="text-foreground">Insights </span>
          <span className="text-gradient-brand">Avançados</span>
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Tendências temporais, engajamento da base e cruzamento de perfil.
        </p>
      </div>

      <Tabs defaultValue="base" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="base">Base & Aquisição</TabsTrigger>
          <TabsTrigger value="resultados">Resultados dos Formados</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-6 mt-0">

      <ChartCard
        title="Evolução de Matrículas"
        description={`Novas matrículas (Data de Início) — ${PERIOD_LABELS[period].toLowerCase()}`}
        height={380}
        action={
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {timeline.length === 0 ? (
          <div className="h-full grid place-items-center text-xs text-muted-foreground">
            {isLoading ? "Carregando…" : "Sem dados"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval="preserveStartEnd" minTickGap={20} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.values(POS_LABELS).map((curso) => (
                <Line
                  key={curso}
                  type="monotone"
                  dataKey={curso}
                  stroke={CURSO_COLORS[curso]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Engajamento da Base"
          description={`Distribuição de dias desde o último acesso (alunos ativos · ${engajamento.total})`}
          height={360}
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={engajamento.allStudents.length === 0}
                onClick={() => exportEngajamentoCSV(engajamento.allStudents, cursoEng)}
                title="Exportar contatos (Ativa + Pré-confirmada) — Nome, Curso, Faixa, Telefone"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Exportar
              </Button>
              <Select value={cursoEng} onValueChange={setCursoEng}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os cursos</SelectItem>
                  {Object.values(POS_LABELS).map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }

        >
          {engajamento.total === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engajamento.data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
                        const pct = engajamento.total > 0 ? ((total / engajamento.total) * 100).toFixed(1) : "0";
                        return (
                          <div className="rounded-md border border-border bg-popover/90 backdrop-blur-md px-3 py-2 text-xs shadow-sm min-w-[180px]">
                            <div className="font-semibold text-foreground mb-1">{label}</div>
                            <div className="text-muted-foreground mb-1.5">
                              Total: <span className="text-foreground font-semibold">{total}</span>{" "}
                              <span className="opacity-70">({pct}%)</span>
                            </div>
                            <div className="space-y-0.5">
                              {payload
                                .filter((p: any) => p.value > 0)
                                .map((p: any) => (
                                  <div key={p.dataKey} className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                                      {p.dataKey}
                                    </span>
                                    <span className="tabular-nums text-foreground font-medium">{p.value}</span>
                                  </div>
                                ))}
                            </div>
                            <div className="mt-1.5 pt-1.5 border-t border-border text-[10px] text-muted-foreground">
                              Clique nos chips abaixo para ver os alunos
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                    {Object.values(POS_LABELS)
                      .filter((c) => cursoEng === "all" || c === cursoEng)
                      .map((curso, idx, arr) => (
                        <Bar
                          key={curso}
                          dataKey={curso}
                          stackId="eng"
                          fill={CURSO_COLORS[curso]}
                          radius={idx === arr.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ENG_BUCKETS.map((b, i) => {
                  const list = engajamento.students[i];
                  const count = list.length;
                  return (
                    <button
                      key={b.label}
                      type="button"
                      disabled={count === 0}
                      onClick={() =>
                        setDetail({
                          title: `Engajamento · ${b.label}`,
                          subtitle: `${count} aluno(s) ativo(s)${cursoEng !== "all" ? ` · ${cursoEng}` : ""}`,
                          students: list,
                        })
                      }
                      className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-muted/30 px-2.5 py-1 text-[11px] transition-colors"
                    >
                      <span className="h-2 w-2 rounded-sm" style={{ background: b.color }} />
                      <span className="text-foreground font-medium">{b.label}</span>
                      <span className="text-muted-foreground tabular-nums">{count}</span>
                      {count > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Tipo de Instituição"
          description={`Onde os alunos trabalham (${empregadores.total} alunos)`}
          height={360}
        >
          {empregadores.tipos.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2.5 overflow-auto pr-1">
              {empregadores.tipos
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((t) => {
                  const Icon = TIPO_ICONS[t.name] ?? Briefcase;
                  const pct = empregadores.total > 0 ? (t.value / empregadores.total) * 100 : 0;
                  return (
                    <div key={t.name} className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="h-10 w-10 rounded-lg grid place-items-center shrink-0"
                          style={{ background: `${t.color}25`, color: t.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="text-foreground font-semibold tabular-nums">{t.value}</span> alunos
                            <span className="opacity-60"> · {pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: t.color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-5">


        <ChartCard
          title="Canal de Aquisição"
          description={`Como conheceram a Ambiental Pro (${canais.reduce((s, c) => s + c.value, 0)} respostas)`}
          height={360}
        >
          {canais.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2 overflow-auto pr-1">
              {(() => {
                const totalC = canais.reduce((s, c) => s + c.value, 0);
                const maxC = Math.max(...canais.map((c) => c.value), 1);
                return canais.map((c) => {
                  const Icon = CANAL_ICONS[c.name] ?? MoreHorizontal;
                  const pct = totalC > 0 ? (c.value / totalC) * 100 : 0;
                  const barW = (c.value / maxC) * 100;
                  return (
                    <div
                      key={c.name}
                      className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors p-2.5 flex items-center gap-3"
                    >
                      <div
                        className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                        style={{ background: `${c.color}25`, color: c.color }}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <div className="text-xs font-medium text-foreground truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                            <span className="text-foreground font-semibold">{c.value}</span>
                            <span className="opacity-60"> · {pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barW}%`, background: c.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </ChartCard>
      </section>

      <ChartCard
        title="Objetivos ao se Capacitar"
        description={`Top motivos declarados nas fichas de matrícula (${objetivos.reduce((s, o) => s + o.value, 0)} menções)`}
        height={360}
      >
        {objetivos.length === 0 ? (
          <div className="h-full grid place-items-center text-xs text-muted-foreground">
            {isLoading ? "Carregando…" : "Sem dados"}
          </div>
        ) : (
          <div className="h-full overflow-auto pr-1 space-y-2">
            {(() => {
              const totalO = objetivos.reduce((s, o) => s + o.value, 0);
              const maxO = Math.max(...objetivos.map((o) => o.value));
              return objetivos.map((o, i) => {
                const pct = totalO > 0 ? (o.value / totalO) * 100 : 0;
                const barW = maxO > 0 ? (o.value / maxO) * 100 : 0;
                return (
                  <div key={o.name} className="group flex items-center gap-3 py-1">
                    <div className="w-5 text-xs text-muted-foreground tabular-nums text-right shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="text-sm text-foreground truncate">{o.name}</div>
                        <div className="text-xs tabular-nums shrink-0">
                          <span className="font-semibold text-foreground">{o.value}</span>
                          <span className="text-muted-foreground"> · {pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 group-hover:opacity-90"
                          style={{ width: `${barW}%`, background: o.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </ChartCard>
        </TabsContent>

        <TabsContent value="resultados" className="space-y-6 mt-0">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Avaliação Geral do Curso"
          description={`Distribuição das avaliações dos formados (${avaliacao.total} respostas)`}
          height={360}
          action={
            <Select value={cursoAval} onValueChange={setCursoAval}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os cursos</SelectItem>
                {Object.values(POS_LABELS).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {avaliacao.geral.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    const name = p?.name ?? p?.payload?.name;
                    const value = p?.value ?? 0;
                    const pct = avaliacao.total > 0 ? ((Number(value) / avaliacao.total) * 100).toFixed(1) : "0";
                    return (
                      <div className="rounded-md border border-border bg-popover/90 backdrop-blur-md px-3 py-2 text-xs shadow-sm">
                        <div className="font-medium text-foreground">{name}</div>
                        <div className="text-muted-foreground mt-0.5">
                          Alunos: <span className="text-foreground font-semibold">{value}</span>
                          <span className="opacity-70"> ({pct}%)</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                <Pie
                  data={avaliacao.geral}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {avaliacao.geral.map((g) => (
                    <Cell key={g.name} fill={g.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Notas por Critérios"
          description={`Médias avaliadas pelos formados — média global: ${avaliacao.mediaGlobal.toFixed(2)} / 5`}
          height={360}
        >
          {avaliacao.medias.every((m) => m.value === 0) ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <div className="h-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-auto pr-1 content-start">
              {avaliacao.medias
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((m) => {
                  const meta = CRITERIO_META[m.name] ?? { icon: Star, color: "hsl(150 38% 58%)" };
                  const Icon = meta.icon;
                  const pct = (m.value / 5) * 100;
                  const filled = Math.round(m.value);
                  return (
                    <div
                      key={m.name}
                      className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors p-3"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                          style={{ background: `${meta.color}25`, color: meta.color }}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground leading-tight line-clamp-2">{m.name}</div>
                        </div>
                        <div className="text-base font-bold tabular-nums shrink-0" style={{ color: meta.color }}>
                          {m.value.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className="h-3 w-3"
                              style={{
                                color: meta.color,
                                fill: i <= filled ? meta.color : "transparent",
                                opacity: i <= filled ? 1 : 0.3,
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: meta.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Impacto Profissional"
          description={`Mudanças relatadas pelos formados (${impacto.profissional.reduce((s, i) => s + i.value, 0)} respostas)`}
          height={360}
          action={
            <Select value={cursoImpacto} onValueChange={setCursoImpacto}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os cursos</SelectItem>
                {Object.values(POS_LABELS).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {impacto.profissional.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2 overflow-auto pr-1">
              {(() => {
                const totalP = impacto.profissional.reduce((s, i) => s + i.value, 0);
                const maxP = Math.max(...impacto.profissional.map((i) => i.value), 1);
                return impacto.profissional.map((i) => {
                  const Icon = IMP_ICONS[i.name] ?? Sparkles;
                  const pct = totalP > 0 ? (i.value / totalP) * 100 : 0;
                  const barW = (i.value / maxP) * 100;
                  return (
                    <button
                      type="button"
                      key={i.name}
                      onClick={() =>
                        setDetail({
                          title: i.name,
                          subtitle: `Impacto Profissional · ${i.value} aluno(s)${cursoImpacto !== "all" ? ` · ${cursoImpacto}` : ""}`,
                          students: impacto.profStudents[i.name] ?? [],
                        })
                      }
                      className="w-full text-left rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all p-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <div
                          className="h-10 w-10 rounded-lg grid place-items-center shrink-0"
                          style={{ background: `${i.color}25`, color: i.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground leading-tight">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="text-foreground font-semibold tabular-nums">{i.value}</span> alunos
                            <span className="opacity-60"> · {pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barW}%`, background: i.color }}
                        />
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Reconhecimento Financeiro"
          description={`Resultado financeiro relatado após a conclusão (${impacto.financeiro.reduce((s, i) => s + i.value, 0)} respostas)`}
          height={360}
          action={
            <Select value={cursoImpacto} onValueChange={setCursoImpacto}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os cursos</SelectItem>
                {Object.values(POS_LABELS).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {impacto.financeiro.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2.5 overflow-auto pr-1">
              {(() => {
                const totalF = impacto.financeiro.reduce((s, i) => s + i.value, 0);
                return impacto.financeiro.map((i) => {
                  const Icon = FIN_ICONS[i.name] ?? DollarSign;
                  const pct = totalF > 0 ? (i.value / totalF) * 100 : 0;
                  return (
                    <button
                      type="button"
                      key={i.name}
                      onClick={() =>
                        setDetail({
                          title: i.name,
                          subtitle: `Reconhecimento Financeiro · ${i.value} aluno(s)${cursoImpacto !== "all" ? ` · ${cursoImpacto}` : ""}`,
                          students: impacto.finStudents[i.name] ?? [],
                        })
                      }
                      className="w-full text-left rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all p-3 flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className="h-12 w-12 rounded-xl grid place-items-center shrink-0"
                        style={{ background: `${i.color}20`, color: i.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{i.name}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-foreground font-semibold tabular-nums">{i.value}</span> alunos
                          <span className="opacity-60"> · {pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-2xl font-bold tabular-nums shrink-0" style={{ color: i.color }}>
                        {pct.toFixed(0)}%
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </ChartCard>
      </section>
        </TabsContent>
      </Tabs>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug pr-6">{detail?.title}</DialogTitle>
            <DialogDescription className="text-xs">{detail?.subtitle}</DialogDescription>
          </DialogHeader>
          {detail && detail.students.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs self-start"
              onClick={() => exportCategoriaCSV(detail.title, detail.subtitle, detail.students)}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exportar planilha (.CSV)
            </Button>
          )}
          <div className="max-h-[60vh] overflow-auto -mx-6 px-6">
            {detail && detail.students.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Sem alunos registrados.</div>
            ) : (
              <ul className="divide-y divide-border">
                {detail?.students.map((s, idx) => (
                  <li key={`${s.nome}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground truncate">{s.nome}</span>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {s.telefone || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <B2BModule rows={b2bRows} />
    </div>
  );
}

function exportEngajamentoCSV(
  students: { nome: string; telefone: string; curso: string; faixa: string }[],
  cursoFilter: string,
) {
  const esc = (v: string) => {
    const s = (v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const escPhone = (v: string) => {
    const s = (v ?? "").trim();
    if (!s) return '""';
    return `"=""${s.replace(/"/g, '""')}"""`;
  };
  const header = ["Nome", "Curso", "Faixa de Engajamento", "Telefone"].join(",");
  const rows = students.map((s) =>
    [esc(s.nome), esc(s.curso), esc(s.faixa), escPhone(s.telefone)].join(","),
  );
  const csv = "\uFEFF" + [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffix = cursoFilter === "all" ? "todos" : cursoFilter.toLowerCase().replace(/\s+/g, "-");
  a.href = url;
  a.download = `engajamento-contatos-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function Heatmap({
  matrix,
  max,
}: {
  matrix: { renda: string; cells: { atuacao: string; value: number }[] }[];
  max: number;
}) {
  if (!matrix.length || max === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  const atuacoes = matrix[0].cells.map((c) => c.atuacao);
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="sticky left-0 bg-card text-left font-medium text-muted-foreground p-1.5"></th>
            {atuacoes.map((a) => (
              <th
                key={a}
                className="font-medium text-muted-foreground p-1.5 text-center"
                style={{ minWidth: 64 }}
              >
                {ATUACAO_SHORT[a] ?? a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.renda}>
              <td className="sticky left-0 bg-card text-foreground font-medium p-1.5 whitespace-nowrap pr-3">
                {row.renda}
              </td>
              {row.cells.map((cell) => {
                const intensity = max > 0 ? cell.value / max : 0;
                const bg = `hsla(145, 55%, 50%, ${0.08 + intensity * 0.78})`;
                const fg = intensity > 0.55 ? "hsl(0 0% 100%)" : "hsl(var(--foreground))";
                return (
                  <td
                    key={cell.atuacao}
                    className="text-center rounded-md tabular-nums"
                    style={{
                      background: bg,
                      color: fg,
                      padding: "10px 6px",
                      minWidth: 64,
                      fontWeight: cell.value > 0 ? 600 : 400,
                      opacity: cell.value === 0 ? 0.5 : 1,
                    }}
                    title={`${row.renda} · ${cell.atuacao}: ${cell.value}`}
                  >
                    {cell.value || "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ATU_COLORS = ATUACAO_COLORS;

function RendaAtuacaoStacked({
  matrix,
}: {
  matrix: { renda: string; cells: { atuacao: string; value: number }[] }[];
}) {
  const totals = matrix.map((r) => r.cells.reduce((s, c) => s + c.value, 0));
  const grand = totals.reduce((s, n) => s + n, 0);
  if (grand === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  const atuacoes = matrix[0].cells.map((c) => c.atuacao);
  return (
    <div className="h-full flex flex-col gap-3 overflow-auto pr-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10.5px] text-muted-foreground">
        {atuacoes.map((a) => (
          <span key={a} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ATU_COLORS[a] ?? "hsl(0 0% 60%)" }} />
            {ATUACAO_SHORT[a] ?? a}
          </span>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-2.5">
        {matrix.map((row, idx) => {
          const total = totals[idx];
          return (
            <div key={row.renda} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{row.renda}</span>
                <span className="text-muted-foreground tabular-nums">
                  <span className="text-foreground font-semibold">{total}</span> alunos
                </span>
              </div>
              {total === 0 ? (
                <div className="h-7 w-full rounded-md bg-muted/40 grid place-items-center text-[10px] text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <div className="h-7 w-full flex rounded-md overflow-hidden bg-muted/30 ring-1 ring-border/50">
                  {row.cells
                    .filter((c) => c.value > 0)
                    .map((c) => {
                      const pct = (c.value / total) * 100;
                      const color = ATU_COLORS[c.atuacao] ?? "hsl(0 0% 60%)";
                      return (
                        <div
                          key={c.atuacao}
                          title={`${ATUACAO_SHORT[c.atuacao] ?? c.atuacao}: ${c.value} (${pct.toFixed(1)}%)`}
                          className="h-full flex items-center justify-center text-[10px] font-semibold text-white/95 transition-opacity hover:opacity-80"
                          style={{ width: `${pct}%`, background: color }}
                        >
                          {pct >= 8 ? `${pct.toFixed(0)}%` : ""}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function exportCategoriaCSV(
  title: string,
  subtitle: string,
  students: { nome: string; telefone: string }[],
) {
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const escPhone = (v: string) => {
    const s = (v ?? "").trim();
    return s ? `"=""${s.replace(/"/g, "")}"""` : '""';
  };
  const lines = ["Nome,Telefone,Categoria"];
  for (const s of students) {
    lines.push([esc(s.nome), escPhone(s.telefone), esc(title)].join(","));
  }
  const slug = `${subtitle.split("·")[0].trim()}-${title}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug || "categoria"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
