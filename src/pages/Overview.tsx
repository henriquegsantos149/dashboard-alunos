import { useMemo, useState } from "react";
import { Users, UserCheck, GraduationCap, Activity, UserX, Cake, Clock, AlertTriangle } from "lucide-react";
import { useSheetsData, allPosRows, getCol, parseDateBR, daysSince, POS_LABELS, fichaMatriculaPosMba } from "@/lib/sheets";
import { StatCard } from "@/components/StatCard";
import { ChartCard, HBarChart, DonutChart, ChartLegend } from "@/components/Charts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import oldFormDataRaw from "@/data/oldForm.json";
import { GenderViz } from "@/components/GenderViz";
import { RendaViz } from "@/components/RendaViz";
import { inferGenderFromName } from "@/lib/genderFromName";
import { AtrasadosList, computeAtrasados, exportAtrasadosCSV } from "@/components/AtrasadosTable";
import { FormadosList, computeFormados, exportFormadosCSV } from "@/components/FormadosTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const oldFormData = oldFormDataRaw as Record<string, string>[];

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Canonical buckets
const STATUS_OPTIONS = [
  "Ativa",
  "Pré-confirmada",
  "Cancelada",
  "Concluída",
  "Formando",
  "Indeferida",
  "Não concluída",
];

const ATUACAO_OPTIONS = [
  "Autônomo / Consultor (PJ)",
  "Estagiário",
  "Trainee",
  "Profissional Contratado (Nível Júnior ou Pleno)",
  "Profissional Contratado (Nível Sênior ou Especialista)",
  "Líder / Gestor / Tomador de Decisões",
  "Servidor Público",
  "Pesquisador",
  "Estudante",
  "Outro",
];

const RENDA_OPTIONS = [
  "Até R$ 2.000",
  "De R$ 2.000 a R$ 4.000",
  "De R$ 4.000 a R$ 7.000",
  "De R$ 7.000 a R$ 10.000",
  "Acima de R$ 10.000",
  "Prefiro não responder",
];

function matchRenda(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "";
  if (v.includes("ate r$ 2") || v.includes("ate 2")) return "Até R$ 2.000";
  if (v.includes("2.000 a r$ 4") || v.includes("2000 a 4")) return "De R$ 2.000 a R$ 4.000";
  if (v.includes("4.000 a r$ 7") || v.includes("4000 a 7")) return "De R$ 4.000 a R$ 7.000";
  if (v.includes("7.000 a r$ 10") || v.includes("7000 a 10")) return "De R$ 7.000 a R$ 10.000";
  if (v.includes("acima")) return "Acima de R$ 10.000";
  if (v.includes("prefiro nao") || v.includes("nao responder")) return "Prefiro não responder";
  return "";
}

function matchGenero(raw: string): string {
  const v = stripAccents(raw);
  if (v.includes("masc")) return "Masculino";
  if (v.includes("fem")) return "Feminino";
  if (!v) return "";
  return "Outro";
}

const CURSO_KEYWORDS: Record<string, string[]> = {
  ggsr: ["georreferenciamento"],
  mba: ["mba"],
  alpa: ["auditoria"],
  grac: ["gerenciamento e remediacao", "remediacao"],
  iama: ["ia.ma", "iama", "inteligencia artificial"],
};

function matchCursoFilter(raw: string, filter: string): boolean {
  const v = stripAccents(raw);
  if (!v) return false;
  if (filter === "all") {
    // Apenas as formações de Pós-Graduação / MBA
    return Object.values(CURSO_KEYWORDS).some((kws) => kws.some((k) => v.includes(k)));
  }
  return (CURSO_KEYWORDS[filter] ?? []).some((k) => v.includes(k));
}

const FORMACAO_OPTIONS = [
  "Engenharia Ambiental",
  "Engenharia Florestal",
  "Engenharia Agronômica",
  "Engenharia Civil",
  "Geografia",
  "Geologia",
  "Ciências Biológicas",
  "Meteorologia",
  "Oceanografia",
  "Sistemas de Informação (TI)",
  "Arquitetura e Urbanismo",
  "Ainda não sou formado",
  "Outro",
  "Não informado",
];

function matchStatus(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "Não informado";
  if (v.includes("pre-confirm") || v.includes("preconfirm")) return "Pré-confirmada";
  if (v.includes("ativa")) return "Ativa";
  if (v.includes("cancel")) return "Cancelada";
  if (v.includes("nao conclu")) return "Não concluída";
  if (v.includes("conclu")) return "Concluída";
  if (v.includes("formando")) return "Formando";
  if (v.includes("indefer")) return "Indeferida";
  return "Outro";
}

function matchAtuacao(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "Não informado";
  if (v.includes("autonom") || v.includes("consultor") || /\bpj\b/.test(v)) return "Autônomo / Consultor (PJ)";
  if (v.includes("estagi")) return "Estagiário";
  if (v.includes("trainee")) return "Trainee";
  if (v.includes("lider") || v.includes("gestor") || v.includes("tomador") || v.includes("gerente") || v.includes("diretor") || v.includes("coordenador"))
    return "Líder / Gestor / Tomador de Decisões";
  if (v.includes("pesquisador") || v.includes("pesquisa cientifica") || v.includes("docente") || v.includes("professor"))
    return "Pesquisador";
  if (v.includes("servidor") || v.includes("publico")) return "Servidor Público";
  if (v.includes("estudante")) return "Estudante";
  if (v.includes("senior") || v.includes("especialista")) return "Profissional Contratado (Nível Sênior ou Especialista)";
  if (v.includes("junior") || v.includes("pleno") || v.includes("contratado") || v.includes("clt")) return "Profissional Contratado (Nível Júnior ou Pleno)";
  return "Outro";
}

function matchFormacao(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "Não informado";
  if (v.includes("ambiental")) return "Engenharia Ambiental";
  if (v.includes("florestal")) return "Engenharia Florestal";
  if (v.includes("agronom") || v.includes("agronomia")) return "Engenharia Agronômica";
  if (v.includes("civil")) return "Engenharia Civil";
  if (v.includes("geografia")) return "Geografia";
  if (v.includes("geologia")) return "Geologia";
  if (v.includes("biolog")) return "Ciências Biológicas";
  if (v.includes("meteorolog")) return "Meteorologia";
  if (v.includes("oceanograf")) return "Oceanografia";
  if (v.includes("sistemas de informa") || /\bti\b/.test(v) || v.includes("tecnologia da informa")) return "Sistemas de Informação (TI)";
  if (v.includes("arquitetura") || v.includes("urbanismo")) return "Arquitetura e Urbanismo";
  if (v.includes("ainda nao") || v.includes("nao sou formad") || v.includes("cursando") || v.includes("graduando")) return "Ainda não sou formado";
  return "Outro";
}

function bucketCounts(rows: Record<string, string>[], names: string[], options: string[], matcher: (s: string) => string) {
  const map = new Map<string, number>();
  for (const opt of options) map.set(opt, 0);
  for (const r of rows) {
    const raw = getCol(r, names);
    const bucket = matcher(raw);
    if (map.has(bucket)) map.set(bucket, (map.get(bucket) ?? 0) + 1);
  }
  return options.map((name) => ({ name, value: map.get(name) ?? 0 })).filter((d) => d.value > 0);
}

function countBy(rows: Record<string, string>[], names: string[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = getCol(r, names).trim() || "Não informado";
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

type RendaAluno = { faixa: string; nome: string; email: string; telefone: string; curso: string };

function exportRendaCSV(alunos: RendaAluno[], faixa: string) {
  const list = faixa === "all" ? alunos : alunos.filter((a) => a.faixa === faixa);
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Faixa de Renda,Nome,E-mail,Telefone,Curso"];
  for (const a of list) lines.push([esc(a.faixa), esc(a.nome), esc(a.email), esc(a.telefone), esc(a.curso)].join(","));
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alunos-faixa-renda-${faixa === "all" ? "todas" : faixa.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type AtuacaoAluno = {
  atuacao: string;
  nome: string;
  email: string;
  telefone: string;
  formacao: string;
  empresa: string;
};

function exportAtuacaoCSV(alunos: AtuacaoAluno[], categoria: string) {
  const list = categoria === "all" ? alunos : alunos.filter((a) => a.atuacao === categoria);
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Nome,E-mail,Telefone,Atuação Profissional,Formação,Instituição/Empresa"];
  for (const a of list)
    lines.push(
      [esc(a.nome), esc(a.email), esc(a.telefone), esc(a.atuacao), esc(a.formacao), esc(a.empresa)].join(",")
    );
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alunos-atuacao-${
    categoria === "all" ? "todas" : stripAccents(categoria).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type FormacaoAluno = {
  formacao: string;
  nome: string;
  email: string;
  telefone: string;
  atuacao: string;
  empresa: string;
};

function exportFormacaoCSV(alunos: FormacaoAluno[], categoria: string) {
  const list = categoria === "all" ? alunos : alunos.filter((a) => a.formacao === categoria);
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Nome,E-mail,Telefone,Formação,Atuação Profissional,Instituição/Empresa"];
  for (const a of list)
    lines.push(
      [esc(a.nome), esc(a.email), esc(a.telefone), esc(a.formacao), esc(a.atuacao), esc(a.empresa)].join(",")
    );
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alunos-formacao-${
    categoria === "all" ? "todas" : stripAccents(categoria).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ACTIVE_STATUSES = new Set(["Ativa", "Pré-confirmada", "Formando"]);

export default function Overview() {
  const { data, isLoading } = useSheetsData();
  const [filter, setFilter] = useState<"all" | "ggsr" | "mba" | "alpa" | "grac" | "iama">("all");
  const [atrasadosOpen, setAtrasadosOpen] = useState(false);
  const [formadosOpen, setFormadosOpen] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return allPosRows(data);
    return (data.pos[filter] ?? []).map((r) => ({ ...r, _curso: POS_LABELS[filter] }));
  }, [data, filter]);

  const metrics = useMemo(() => {
    let ativos = 0, formados = 0, saude = 0, inativos = 0, atrasados = 0, evasao = 0, baseElegivel = 0;
    // Total = alunos ÚNICOS (matrícula/e-mail/nome), sem linhas vazias e sem
    // matrículas canceladas/indeferidas (trancamentos).
    const uniq = new Set<string>();
    const now = new Date();
    for (const r of rows) {
      const status = matchStatus(getCol(r, ["Status de Matrícula"]));
      const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]).trim();
      const email = getCol(r, ["E-mail", "Email"]).trim().toLowerCase();
      const matricula = getCol(r, ["Matrícula / ID", "Matrícula", "CPF"]).trim();
      const idKey = matricula || email || (nome ? "n:" + stripAccents(nome) : "");
      if (idKey && status !== "Cancelada" && status !== "Indeferida") uniq.add(idKey);
      const isActive = ACTIVE_STATUSES.has(status);

      if (isActive) ativos++;
      if (status === "Concluída") formados++;
      if (status === "Ativa" || status === "Pré-confirmada" || status === "Concluída") baseElegivel++;
      if (status === "Não concluída") evasao++;
      if (status === "Ativa" || status === "Pré-confirmada") {
        const diasRaw = getCol(r, ["Dias que faltam para Integralização"]);
        const diasNum = parseInt(diasRaw.replace(/[^\d-]/g, ""), 10);
        const dataFinal = parseDateBR(getCol(r, ["Data Final"]));
        const isNeg = !isNaN(diasNum) && diasRaw.trim().startsWith("-");
        const isPast = dataFinal ? dataFinal.getTime() < now.getTime() : false;
        if (isNeg || isPast) atrasados++;
      }
      if (isActive) {
        const ult = parseDateBR(getCol(r, ["Último Acesso"]));
        const d = daysSince(ult);
        if (d !== null) {
          if (d <= 15) saude++;
          if (d > 60) inativos++;
        }
      }
    }
    const pct = (n: number) => (ativos > 0 ? Math.round((n / ativos) * 100) : 0);
    const pctBase = (n: number) => (baseElegivel > 0 ? Math.round((n / baseElegivel) * 100) : 0);
    return { total: uniq.size, ativos, formados, saude, inativos, saudePct: pct(saude), inativosPct: pct(inativos), atrasados, evasao, atrasadosPct: pctBase(atrasados), evasaoPct: pctBase(evasao) };
  }, [rows]);

  const statusData = useMemo(
    () => bucketCounts(rows, ["Status de Matrícula"], STATUS_OPTIONS, matchStatus),
    [rows]
  );
  // Formação vinda das Fichas (chave: e-mail / CPF), usada quando a aba do
  // curso não traz a coluna "Formação" (ex.: Pós-IA.MA)
  const formacaoByKey = useMemo(() => {
    const map = new Map<string, string>();
    const add = (key: string, val: string) => {
      const k = key.trim().toLowerCase();
      if (k && val.trim() && !map.has(k)) map.set(k, val);
    };
    const sources = [
      ...(data?.fichaMatricula ?? []),
      ...(data?.formados ?? []),
      ...oldFormData,
    ];
    for (const r of sources) {
      const formacao = getCol(r, [
        "Qual a sua principal formação?",
        "Qual é a sua principal formação?",
        "Formação",
        "Graduação",
      ]);
      if (!formacao.trim()) continue;
      add(
        getCol(r, [
          "Qual o e-mail que você utilizou na sua matrícula?",
          "E-mail",
          "Email",
          "e-mail",
        ]),
        formacao
      );
      const cpf = getCol(r, ["CPF", "Qual o seu CPF?"]).replace(/\D/g, "");
      if (cpf) add(cpf, formacao);
    }
    return map;
  }, [data]);

  const formacaoData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const opt of FORMACAO_OPTIONS) counts.set(opt, 0);
    for (const r of rows) {
      let raw = getCol(r, ["Formação", "Graduação"]).trim();
      if (!raw) {
        const email = getCol(r, ["E-mail", "Email"]).trim().toLowerCase();
        const cpf = getCol(r, ["CPF", "Matrícula / ID"]).replace(/\D/g, "");
        raw = (email && formacaoByKey.get(email)) || (cpf && formacaoByKey.get(cpf)) || "";
      }
      const bucket = raw.trim() ? matchFormacao(raw) : "Não informado";
      if (counts.has(bucket)) counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return FORMACAO_OPTIONS.map((name) => ({ name, value: counts.get(name) ?? 0 })).filter((d) => d.value > 0);
  }, [rows, formacaoByKey]);
  const cursoData = useMemo(() => countBy(rows, ["_curso"]), [rows]);

  // Legacy form rows filtered by current course tab
  const oldFormRows = useMemo(() => {
    const fmCol = ["Você se matriculou em qual das nossas formações?"];
    return oldFormData.filter((r) => matchCursoFilter(getCol(r, fmCol), filter));
  }, [filter]);

  const fichaRows = useMemo(() => {
    if (!data) return [] as Record<string, string>[];
    const fmCol = ["Você se matriculou em qual das nossas formações?"];
    const foCol = ["Você concluiu qual das nossas formações?"];
    const out: Record<string, string>[] = [];
    for (const r of data.fichaMatricula) {
      if (matchCursoFilter(getCol(r, fmCol), filter)) out.push(r);
    }
    for (const r of data.formados) {
      if (matchCursoFilter(getCol(r, foCol), filter)) out.push(r);
    }
    for (const r of oldFormRows) out.push(r);
    return out;
  }, [data, filter, oldFormRows]);

  const atuacaoData = useMemo(() => {
    const sources: Record<string, string>[] = [];
    for (const r of rows) sources.push(r);
    for (const r of fichaRows) sources.push(r);
    // Mostra TODAS as categorias do formulário, mesmo com zero respostas
    const counts = new Map<string, number>(ATUACAO_OPTIONS.map((o) => [o, 0]));
    for (const r of sources) {
      const bucket = matchAtuacao(
        getCol(r, ["Atuação", "Atuação Profissional", "principal atuação", "principal atuacao"])
      );
      if (counts.has(bucket)) counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return ATUACAO_OPTIONS.map((name) => ({ name, value: counts.get(name) ?? 0 }));
  }, [rows, fichaRows]);

  // Lista de alunos por categoria de atuação (para exportação)
  const atuacaoAlunos = useMemo(() => {
    const ATUACAO_COLS = ["Atuação", "Atuação Profissional", "principal atuação", "principal atuacao"];
    const NOME_COLS = ["Aluno(a)", "Nome do Aluno", "Nome", "Aluno", "Qual o seu nome?"];
    const EMAIL_COLS = ["E-mail", "Email", "Qual o e-mail que você utilizou na sua matrícula?", "Qual o seu e-mail?"];
    const TEL_COLS = ["Celular", "WhatsApp", "Whatsapp", "Telefone", "Qual o seu WhatsApp?"];
    const FORM_COLS = ["Formação", "Graduação", "Qual a sua principal formação?", "Qual é a sua principal formação?"];
    const EMP_COLS = [
      "Empresa que trabalha",
      "Você trabalha em alguma empresa? Se sim, qual?",
      "Empresa",
      "Instituição",
    ];

    const byKey = new Map<string, AtuacaoAluno>();
    const consume = (r: Record<string, string>) => {
      const nome = getCol(r, NOME_COLS).trim();
      const email = getCol(r, EMAIL_COLS).trim();
      if (!nome && !email) return;
      const key = email ? "e:" + email.toLowerCase() : "n:" + stripAccents(nome);
      const raw = getCol(r, ATUACAO_COLS).trim();
      const cur = byKey.get(key) ?? { atuacao: "", nome, email, telefone: "", formacao: "", empresa: "" };
      if (!cur.nome) cur.nome = nome;
      if (!cur.email) cur.email = email;
      if (!cur.telefone) cur.telefone = getCol(r, TEL_COLS).trim();
      if (!cur.formacao) cur.formacao = getCol(r, FORM_COLS).trim();
      if (!cur.empresa) cur.empresa = getCol(r, EMP_COLS).trim();
      if (!cur.atuacao && raw) cur.atuacao = matchAtuacao(raw);
      byKey.set(key, cur);
    };
    for (const r of rows) consume(r);
    for (const r of fichaRows) consume(r);

    return Array.from(byKey.values())
      .map((a) => ({
        ...a,
        atuacao: a.atuacao || "Não informado",
        formacao:
          a.formacao ||
          (a.email && formacaoByKey.get(a.email.toLowerCase())) ||
          "",
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rows, fichaRows, formacaoByKey]);

  // Lista de alunos por área de formação (para exportação)
  const formacaoAlunos = useMemo<FormacaoAluno[]>(
    () =>
      atuacaoAlunos.map((a) => ({
        formacao: matchFormacao(a.formacao),
        nome: a.nome,
        email: a.email,
        telefone: a.telefone,
        atuacao: a.atuacao,
        empresa: a.empresa,
      })),
    [atuacaoAlunos]
  );



  const idadeStats = useMemo(() => {
    const ages: number[] = [];
    for (const r of fichaRows) {
      const v = getCol(r, ["Qual a sua idade?", "Qual é a sua idade?", "Idade"]);
      const n = parseInt(v.replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > 10 && n < 100) ages.push(n);
    }
    const buckets = [
      { name: "≤ 24", test: (a: number) => a <= 24 },
      { name: "25–29", test: (a: number) => a >= 25 && a <= 29 },
      { name: "30–34", test: (a: number) => a >= 30 && a <= 34 },
      { name: "35–39", test: (a: number) => a >= 35 && a <= 39 },
      { name: "40–49", test: (a: number) => a >= 40 && a <= 49 },
      { name: "50+", test: (a: number) => a >= 50 },
    ].map((b) => ({ name: b.name, value: ages.filter(b.test).length }));
    if (!ages.length) return { avg: 0, count: 0, min: 0, max: 0, buckets };
    const sum = ages.reduce((a, b) => a + b, 0);
    return { avg: sum / ages.length, count: ages.length, min: Math.min(...ages), max: Math.max(...ages), buckets };
  }, [fichaRows]);

  const generoData = useMemo(() => {
    const map = new Map<string, number>();
    map.set("Feminino", 0);
    map.set("Masculino", 0);
    map.set("Não identificado", 0);
    for (const r of rows) {
      const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]);
      const g = inferGenderFromName(nome);
      if (g) map.set(g, (map.get(g) ?? 0) + 1);
      else map.set("Não identificado", (map.get("Não identificado") ?? 0) + 1);
    }
    return ["Feminino", "Masculino", "Não identificado"]
      .map((name) => ({ name, value: map.get(name) ?? 0 }))
      .filter((d) => d.value > 0);
  }, [rows]);

  const renda = useMemo(() => {
    if (!data) return { data: [] as { name: string; value: number }[], alunos: [] as RendaAluno[] };
    const map = new Map<string, number>();
    for (const opt of RENDA_OPTIONS) map.set(opt, 0);

    const norm = (s: string) => s.toLowerCase().trim();
    const keysOf = (email: string, name: string): string[] => {
      const ks: string[] = [];
      if (email) ks.push("e:" + norm(email));
      if (name) ks.push("n:" + norm(name));
      return ks;
    };

    // Universe = students in current course filter (pos rows)
    const universe: { keys: string[]; nome: string; email: string; telefone: string; curso: string }[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const e = getCol(r, ["E-mail", "Email"]);
      const n = getCol(r, ["Aluno(a)", "Nome do Aluno", "Nome", "Aluno"]);
      const ks = keysOf(e, n);
      if (!ks.length) continue;
      const sig = ks.join("|");
      if (seen.has(sig)) continue;
      seen.add(sig);
      universe.push({
        keys: ks,
        nome: n.trim(),
        email: e.trim(),
        telefone: getCol(r, ["Celular", "WhatsApp", "Whatsapp", "Telefone"]).trim(),
        curso: (r as any)._curso ?? "",
      });
    }

    // Lookup: faturamento (Ficha Alunos 10K) — always > R$ 10.000
    const has10kFicha = new Set<string>();
    for (const r of data.fichaAlunos10k) {
      const v = getCol(r, ["Qual é o seu faturamento médio mensal atual com atividades na área ambiental?"]);
      if (!v) continue;
      const e = getCol(r, ["Qual o seu e-mail?"]);
      const n = getCol(r, ["Qual o seu nome?"]);
      for (const k of keysOf(e, n)) has10kFicha.add(k);
    }
    // Presence in Alunos 10K / Diamante lists → > R$ 10.000
    const has10kList = new Set<string>();
    for (const r of [...data.alunos10k, ...data.alunosDiamante]) {
      const e = getCol(r, ["Email", "E-mail"]);
      const n = getCol(r, ["Nome"]);
      for (const k of keysOf(e, n)) has10kList.add(k);
    }
    // Renda from Ficha de Matrícula + Formados + Legacy form
    const fichaRenda = new Map<string, string>();
    const addFicha = (rs: Record<string, string>[]) => {
      for (const r of rs) {
        const v = getCol(r, [
          "Para entendermos melhor o perfil dos nossos alunos, qual faixa de renda mensal mais se aproxima da sua realidade atualmente?",
          "faixa de renda",
        ]);
        if (!v) continue;
        const e = getCol(r, ["Qual o e-mail que você utilizou na sua matrícula?", "E-mail", "Email"]);
        const n = getCol(r, ["Qual o seu nome?", "Nome"]);
        for (const k of keysOf(e, n)) if (!fichaRenda.has(k)) fichaRenda.set(k, v);
      }
    };
    addFicha(data.fichaMatricula);
    addFicha(data.formados);
    addFicha(oldFormData);

    const alunos: RendaAluno[] = [];
    for (const u of universe) {
      let bucket = "";
      if (u.keys.some((k) => has10kFicha.has(k) || has10kList.has(k))) {
        bucket = "Acima de R$ 10.000";
      } else {
        for (const k of u.keys) {
          const v = fichaRenda.get(k);
          if (v) {
            bucket = matchRenda(v);
            break;
          }
        }
      }
      if (bucket && map.has(bucket)) {
        map.set(bucket, (map.get(bucket) ?? 0) + 1);
        alunos.push({ faixa: bucket, nome: u.nome, email: u.email, telefone: u.telefone, curso: u.curso });
      }
    }
    return {
      data: RENDA_OPTIONS.map((name) => ({ name, value: map.get(name) ?? 0 })).filter((d) => d.value > 0),
      alunos,
    };
  }, [data, rows]);

  const rendaData = renda.data;


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="text-foreground">Visão Geral</span>
            {filter !== "all" && (
              <>
                <span className="text-foreground">: </span>
                <span className="text-gradient-brand">
                  {filter === "ggsr" && "Pós-GGSR"}
                  {filter === "mba" && "MBA"}
                  {filter === "alpa" && "Pós-ALPA"}
                  {filter === "grac" && "Pós-GRAC"}
                  {filter === "iama" && "Pós-IA.MA"}
                </span>
              </>
            )}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Saúde da base, operações e perfil dos alunos das pós-graduações.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="ggsr">Pós-GGSR</TabsTrigger>
            <TabsTrigger value="mba">MBA</TabsTrigger>
            <TabsTrigger value="alpa">Pós-ALPA</TabsTrigger>
            <TabsTrigger value="grac">Pós-GRAC</TabsTrigger>
            <TabsTrigger value="iama">Pós-IA.MA</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <section className={`grid gap-3 sm:gap-4 ${
        filter === "all"
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7"
      }`}>
        <StatCard
          color="info"
          icon={Users}
          label="Total de Alunos"
          value={metrics.total}
          hint="Pós-Graduação (alunos únicos)"
          loading={isLoading}
          info="Total de alunos únicos matriculados. Alunos com matrículas antigas canceladas que geraram novas matrículas posteriormente são contados apenas uma vez."
        />
        <StatCard color="primary" icon={UserCheck} label="Alunos Ativos" value={metrics.ativos} hint="Ativa + Pré-confirmada + Formando" loading={isLoading} />
        {filter !== "all" && (
          <StatCard
            color="warning"
            icon={Activity}
            compact
            label="Saúde da Base"
            value={`${metrics.saude} (${metrics.saudePct}%)`}
            hint="Ativos com acesso ≤ 15 dias"
            loading={isLoading}
          />
        )}
        <StatCard color="pink" icon={GraduationCap} label="Formados" value={metrics.formados} hint="Status concluída" loading={isLoading} onClick={() => setFormadosOpen(true)} />
        {filter !== "all" && (
          <StatCard
            color="destructive"
            icon={UserX}
            compact
            label="Inativos"
            value={`${metrics.inativos} (${metrics.inativosPct}%)`}
            hint="Ativos com acesso > 60 dias"
            loading={isLoading}
          />
        )}
        <StatCard
          color="warning"
          icon={Clock}
          compact
          label="Atrasados"
          value={`${metrics.atrasados} (${metrics.atrasadosPct}%)`}
          hint="Ativos com integralização atrasada"
          loading={isLoading}
          onClick={() => setAtrasadosOpen(true)}
        />
        <StatCard
          color="destructive"
          icon={AlertTriangle}
          compact
          label="Evasão"
          value={`${metrics.evasao} (${metrics.evasaoPct}%)`}
          hint="Status matrícula como Não Concluída"
          loading={isLoading}
        />
      </section>

      <Dialog open={atrasadosOpen} onOpenChange={setAtrasadosOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <DialogTitle>Relatório de Alunos com Integralização Atrasada</DialogTitle>
              <Button
                size="sm"
                onClick={() => exportAtrasadosCSV(computeAtrasados(rows))}
                disabled={metrics.atrasados === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Contatos (.CSV)
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <AtrasadosList rows={rows} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formadosOpen} onOpenChange={setFormadosOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <DialogTitle>Relatório de Alunos Formados (Status Concluída)</DialogTitle>
              <Button
                size="sm"
                onClick={() => exportFormadosCSV(computeFormados(rows))}
                disabled={metrics.formados === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Contatos dos Formados (.CSV)
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <FormadosList rows={rows} />
          </div>
        </DialogContent>
      </Dialog>





      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
        <ChartCard title="Status de Matrícula" description="Distribuição por status" height={360}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full items-center">
            <div className="h-full min-h-[200px] min-w-0">
              <DonutChart data={statusData} />
            </div>
            <div className="h-full flex items-center min-w-0">
              <ChartLegend data={statusData} />
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Atuação Profissional"
          description="Categorias padronizadas"
          height={360}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onClick={() => exportAtuacaoCSV(atuacaoAlunos, "all")}>
                  Todas as categorias ({atuacaoAlunos.length})
                </DropdownMenuItem>
                {atuacaoData.map((d) => (
                  <DropdownMenuItem key={d.name} onClick={() => exportAtuacaoCSV(atuacaoAlunos, d.name)}>
                    <span className="truncate">{d.name}</span>
                    <span className="ml-auto pl-2 text-muted-foreground tabular-nums">
                      {atuacaoAlunos.filter((a) => a.atuacao === d.name).length}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <HBarChart data={atuacaoData} tooltipLabel="Atuação" />
        </ChartCard>

        <ChartCard
          title="Formação"
          description="Áreas de formação acadêmica"
          height={360}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onClick={() => exportFormacaoCSV(formacaoAlunos, "all")}>
                  Todas as formações ({formacaoAlunos.length})
                </DropdownMenuItem>
                {formacaoData.map((d) => (
                  <DropdownMenuItem key={d.name} onClick={() => exportFormacaoCSV(formacaoAlunos, d.name)}>
                    <span className="truncate">{d.name}</span>
                    <span className="ml-auto pl-2 text-muted-foreground tabular-nums">
                      {formacaoAlunos.filter((a) => a.formacao === d.name).length}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <HBarChart data={formacaoData} tooltipLabel="Formação" />
        </ChartCard>

        <ChartCard
          title="Faixa de Renda Mensal"
          description="Fichas de Matrícula e Formados"
          height={360}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8" disabled={renda.alunos.length === 0}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => exportRendaCSV(renda.alunos, "all")}>
                  Todas as faixas ({renda.alunos.length})
                </DropdownMenuItem>
                {rendaData.map((d) => (
                  <DropdownMenuItem key={d.name} onClick={() => exportRendaCSV(renda.alunos, d.name)}>
                    {d.name} ({d.value})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <RendaViz data={rendaData} />
        </ChartCard>

        <ChartCard title="Idade dos Alunos" description="Com base nas Fichas de Matrícula e Formados" height={360}>
          {idadeStats.count > 0 ? (
            <div className="h-full flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-2">
                <div className="h-14 w-14 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                  <Cake className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gradient-brand tabular-nums leading-none">
                      {idadeStats.avg.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">anos (média)</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Mín <span className="text-foreground font-medium">{idadeStats.min}</span> · Máx{" "}
                    <span className="text-foreground font-medium">{idadeStats.max}</span> · Base{" "}
                    <span className="text-foreground font-medium">{idadeStats.count}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end gap-1.5 pt-2">
                {(() => {
                  const max = Math.max(...idadeStats.buckets.map((b) => b.value), 1);
                  return idadeStats.buckets.map((b) => {
                    const pct = idadeStats.count > 0 ? (b.value / idadeStats.count) * 100 : 0;
                    const w = (b.value / max) * 100;
                    return (
                      <div key={b.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-12 text-muted-foreground tabular-nums shrink-0">{b.name}</span>
                        <div className="flex-1 h-3 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                            style={{ width: `${w}%` }}
                          />
                        </div>
                        <span className="w-20 text-right tabular-nums text-foreground font-medium shrink-0">
                          {b.value} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard title="Gênero" description="Distribuição por gênero (Ficha de Matrícula)" height={360}>
          <GenderViz data={generoData} />
        </ChartCard>
      </section>
    </div>
  );
}
