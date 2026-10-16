import { useMemo, useState } from "react";
import { Calendar, Download, Flame, Target, ChevronDown, ChevronUp, GraduationCap } from "lucide-react";
import { useSheetsData, allPosRows, getCol, parseDateBR } from "@/lib/sheets";
import oldFormDataRaw from "@/data/oldForm.json";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const oldFormData = oldFormDataRaw as Record<string, string>[];

// ---------- helpers ----------
const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const looseKey = (s: string) => stripAccents(s).replace(/[^a-z0-9]/g, "");
const normEmail = (s: string) => (s || "").toLowerCase().trim();

function formatPhone(raw: string) {
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
  if (d.length === 11 && d[2] === "9") {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `+${d}`;
}

function matchStatus(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "";
  if (v.includes("pre-confirm") || v.includes("preconfirm")) return "Pré-confirmada";
  if (v.includes("ativa")) return "Ativa";
  if (v.includes("cancel")) return "Cancelada";
  if (v.includes("nao conclu")) return "Não concluída";
  if (v.includes("conclu")) return "Concluída";
  if (v.includes("formando")) return "Formando";
  if (v.includes("indefer")) return "Indeferida";
  return "Outro";
}

// ---------- Padronização de Formação Acadêmica ----------
const FORMACAO_OPTIONS = [
  "Engenharia Ambiental",
  "Engenharia Florestal",
  "Engenharia Agronômica",
  "Engenharia Agrícola",
  "Engenharia Civil",
  "Engenharia Cartográfica e de Agrimensura",
  "Geografia",
  "Geologia",
  "Ciências Biológicas",
  "Meteorologia",
  "Oceanografia",
  "Matemática",
  "Sistemas de Informação (TI)",
  "Arquitetura e Urbanismo",
  "Tecnólogo em Logística",
  "Tecnólogo em Agrimensura",
  "Ainda não sou formado",
] as const;

function sanitizeText(raw: string): string {
  const t = (raw || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function matchFormacao(raw: string): string {
  const original = sanitizeText(raw);
  if (!original) return "";
  const v = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\?/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
  if (/(tecnolog|tecnic)/.test(v) && v.includes("logistic")) return "Tecnólogo em Logística";
  if (/(tecnolog|tecnic)/.test(v) && v.includes("agrimens")) return "Tecnólogo em Agrimensura";
  if (v.includes("cartograf") || (v.includes("agrimens") && v.includes("engenh"))) return "Engenharia Cartográfica e de Agrimensura";
  if (v.includes("engenh") && v.includes("agricol")) return "Engenharia Agrícola";
  if (v.includes("ambiental")) return "Engenharia Ambiental";
  if (v.includes("florestal")) return "Engenharia Florestal";
  if (v.includes("agronom")) return "Engenharia Agronômica";
  if (v.includes("civil")) return "Engenharia Civil";
  if (v.includes("biolog")) return "Ciências Biológicas";
  if (v.includes("geografia")) return "Geografia";
  if (v.includes("geologia")) return "Geologia";
  if (v.includes("meteorolog")) return "Meteorologia";
  if (v.includes("oceanograf")) return "Oceanografia";
  if (v.includes("matematic") || v.includes("ciencias matematicas")) return "Matemática";
  if (v.includes("sistemas de informa") || /\bti\b/.test(v) || v.includes("tecnologia da informa")) return "Sistemas de Informação (TI)";
  if (v.includes("arquitetura") || v.includes("urbanismo")) return "Arquitetura e Urbanismo";
  if (v.includes("ainda nao") || v.includes("nao sou formad") || v.includes("cursando") || v.includes("graduando")) return "Ainda não sou formado";
  return original;
}

type Curso = "Pós-GGSR" | "MBA" | "Pós-ALPA" | "Pós-GRAC";

type Aluno = {
  key: string;
  nome: string;
  email: string;
  telefone: string;
  cursos: Set<Curso>;
  status: string;
  formacao: string;
  dataNascimentoDate: Date | null;
};

const STATUS_RANK: Record<string, number> = {
  Concluída: 5,
  Formando: 4,
  Ativa: 3,
  "Pré-confirmada": 2,
  "Não concluída": 1,
  Indeferida: 0,
  Cancelada: 0,
  "": 0,
  Outro: 0,
};

const STATUS_ELEGIVEIS = ["Ativa", "Pré-confirmada", "Concluída", "Formando"];

const cursosLabel = (a: Aluno) => Array.from(a.cursos).join(", ");

// ---------- CSV ----------
function downloadCSV(filename: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const formatBirthday = (d: Date | null) =>
  d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : "";

// ---------- main ----------
export default function ComercialPage() {
  const { data, isLoading } = useSheetsData();

  const alunos = useMemo<Aluno[]>(() => {
    if (!data) return [];

    type Profile = {
      telefone?: string;
      email?: string;
      nome?: string;
      formacao?: string;
      dataNascimentoDate?: Date | null;
    };
    const profile = new Map<string, Profile>();
    const setProfile = (key: string, patch: Profile) => {
      if (!key) return;
      const cur = profile.get(key) ?? {};
      for (const [k, v] of Object.entries(patch)) {
        if (v && !(cur as any)[k]) (cur as any)[k] = v;
      }
      profile.set(key, cur);
    };

    const fichas = [...data.fichaMatricula, ...data.formados, ...oldFormData];
    for (const r of fichas) {
      const email = getCol(r, [
        "Qual o e-mail que você utilizou na sua matrícula?",
        "Qual o e-mail que você utilizou em sua matrícula?",
        "E-mail",
        "Email",
      ]);
      const nome = getCol(r, ["Qual o seu nome?", "Nome"]);
      const telefone = getCol(r, [
        "Qual o seu Whatsapp (com DDD)?",
        "Qual é o seu Whatsapp (com DDD)?",
        "Whatsapp",
        "WhatsApp",
        "Telefone",
        "Celular",
        "Contato",
      ]);
      const formacao = matchFormacao(
        getCol(r, [
          "Qual a sua formação acadêmica?",
          "Qual sua formação acadêmica?",
          "Formação acadêmica",
          "Formação Acadêmica",
          "Formação",
          "formacao",
        ]),
      );
      const nascRaw = getCol(r, [
        "Data de Nascimento",
        "Data de nascimento",
        "Nascimento",
        "Aniversário",
        "Aniversario",
        "Data de Nasc.",
      ]).trim();
      const nascDate = parseDateBR(nascRaw);
      const ek = email ? "e:" + normEmail(email) : "";
      const nk = nome ? "n:" + looseKey(nome) : "";
      const patch: Profile = { telefone, email, nome, formacao, dataNascimentoDate: nascDate };
      if (ek) setProfile(ek, patch);
      if (nk) setProfile(nk, patch);
    }

    const byKey = new Map<string, Aluno>();
    for (const r of allPosRows(data)) {
      const curso = (r as any)._curso as Curso;
      const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]).trim();
      const email = getCol(r, ["E-mail", "Email"]).trim();
      const tel = getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]).trim();
      const status = matchStatus(getCol(r, ["Status de Matrícula"]));
      const formacaoRow = matchFormacao(getCol(r, ["Formação", "Formação Acadêmica"]));
      if (!nome && !email) continue;

      const ek = email ? "e:" + normEmail(email) : "";
      const nk = nome ? "n:" + looseKey(nome) : "";
      const key = ek || nk;
      const p = (ek && profile.get(ek)) || (nk && profile.get(nk)) || {};

      const existing = byKey.get(key);
      if (existing) {
        existing.cursos.add(curso);
        if ((STATUS_RANK[status] ?? 0) > (STATUS_RANK[existing.status] ?? 0))
          existing.status = status;
        if (!existing.telefone) existing.telefone = tel || p.telefone || "";
        if (!existing.formacao) existing.formacao = formacaoRow || p.formacao || "";
        if (!existing.dataNascimentoDate) existing.dataNascimentoDate = p.dataNascimentoDate || null;
      } else {
        byKey.set(key, {
          key,
          nome: nome || p.nome || "(sem nome)",
          email: email || p.email || "",
          telefone: tel || p.telefone || "",
          cursos: new Set<Curso>([curso]),
          status,
          formacao: formacaoRow || p.formacao || "",
          dataNascimentoDate: p.dataNascimentoDate || null,
        });
      }
    }
    return Array.from(byKey.values());
  }, [data]);

  // Base elegível (regra de status rígida aplicada em toda a aba comercial)
  const baseElegivel = useMemo(
    () => alunos.filter((a) => STATUS_ELEGIVEIS.includes(a.status)),
    [alunos],
  );

  // ---------- Upgrade ----------
  const upgradeAlunos = useMemo(
    () => baseElegivel.filter((a) => a.status === "Concluída" || a.status === "Formando"),
    [baseElegivel],
  );
  const totalUpgrade = upgradeAlunos.length;

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeCurso, setUpgradeCurso] = useState<string>("all");

  const cursosUpgrade = useMemo(() => {
    const s = new Set<string>();
    for (const a of upgradeAlunos) for (const c of a.cursos) s.add(c);
    return Array.from(s).sort();
  }, [upgradeAlunos]);

  const upgradeFiltrados = useMemo(
    () =>
      upgradeAlunos.filter(
        (a) => upgradeCurso === "all" || a.cursos.has(upgradeCurso as Curso),
      ),
    [upgradeAlunos, upgradeCurso],
  );

  const mesAtual = new Date().getMonth() + 1;
  const totalAniversariantesMes = useMemo(
    () =>
      baseElegivel.filter(
        (a) => a.dataNascimentoDate && a.dataNascimentoDate.getMonth() + 1 === mesAtual,
      ).length,
    [baseElegivel, mesAtual],
  );

  // ---------- Campanhas Sazonais ----------
  const MESES = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const [campanhaMes, setCampanhaMes] = useState<string>(String(mesAtual));
  const [campanhaProfissao, setCampanhaProfissao] = useState<string>("all");
  const [campanhaTab, setCampanhaTab] = useState<"profissao" | "aniversario">("profissao");

  const profissoesUnicas = useMemo(() => {
    const presentes = new Set<string>();
    for (const a of baseElegivel) if (a.formacao) presentes.add(a.formacao);
    return FORMACAO_OPTIONS.filter((o) => presentes.has(o));
  }, [baseElegivel]);

  const campanhaProfissaoAlunos = useMemo(
    () =>
      baseElegivel.filter(
        (a) => campanhaProfissao === "all" || a.formacao === campanhaProfissao,
      ),
    [baseElegivel, campanhaProfissao],
  );

  const campanhaAniversariantes = useMemo(() => {
    if (campanhaMes === "all") return [];
    return baseElegivel.filter(
      (a) =>
        a.dataNascimentoDate &&
        String(a.dataNascimentoDate.getMonth() + 1) === campanhaMes,
    );
  }, [baseElegivel, campanhaMes]);

  const exportProfissaoCSV = (file: string, list: Aluno[]) =>
    downloadCSV(
      file,
      ["Nome", "Email", "Telefone", "Formação Acadêmica", "Curso", "Status da Matrícula"],
      list.map((a) => [
        a.nome,
        a.email,
        formatPhone(a.telefone),
        a.formacao || "—",
        cursosLabel(a) || "—",
        a.status,
      ]),
    );

  const exportAniversarioCSV = (file: string, list: Aluno[]) =>
    downloadCSV(
      file,
      ["Nome", "Email", "Telefone", "Formação Acadêmica", "Data de Aniversário", "Curso", "Status da Matrícula"],
      list.map((a) => [
        a.nome,
        a.email,
        formatPhone(a.telefone),
        a.formacao || "—",
        formatBirthday(a.dataNascimentoDate),
        cursosLabel(a) || "—",
        a.status,
      ]),
    );

  const exportUpgradeCSV = (file: string, list: Aluno[]) =>
    downloadCSV(
      file,
      ["Nome", "E-mail", "Telefone", "Curso Concluído", "Status"],
      list.map((a) => [
        a.nome,
        a.email,
        formatPhone(a.telefone),
        cursosLabel(a) || "—",
        a.status,
      ]),
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Inteligência <span className="text-gradient-brand">Comercial</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Central de campanhas sazonais: extraia listas de alunos por profissão ou por mês de aniversário,
          prontas para o time comercial.
        </p>
      </div>

      {/* KPIs essenciais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <button
          type="button"
          onClick={() => setUpgradeOpen((v) => !v)}
          className="text-left rounded-lg ring-offset-background transition hover:ring-2 hover:ring-warning/40 focus:outline-none focus:ring-2 focus:ring-warning"
          aria-expanded={upgradeOpen}
        >
          <StatCard
            color="warning"
            icon={Flame}
            label="Elegíveis para Upgrade"
            value={totalUpgrade}
            hint={
              upgradeOpen
                ? "Clique para fechar a lista"
                : "Clique para ver os alunos prontos para uma 2ª pós ou MBA"
            }
            loading={isLoading}
          />
        </button>
        <StatCard
          color="primary"
          icon={Calendar}
          label={`Aniversariantes de ${MESES[mesAtual - 1].label}`}
          value={totalAniversariantesMes}
          hint="Alunos elegíveis com aniversário no mês atual"
          loading={isLoading}
        />
      </section>

      {/* Lista de Alunos Prontos para Upgrade */}
      {upgradeOpen && (
        <section className="rounded-2xl border border-warning/30 bg-card/70 backdrop-blur-md p-5">
          <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-warning" /> Lista de Alunos Prontos para Upgrade
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Alunos com status <span className="font-medium text-foreground">Concluída</span> ou{" "}
                <span className="font-medium text-foreground">Formando</span>. Filtre pelo curso de origem
                para identificar a próxima especialização ideal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUpgradeOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Fechar <ChevronUp className="h-3 w-3" />
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
            <div className="md:col-span-5">
              <label className="text-xs text-muted-foreground mb-1 block">Curso de Origem</label>
              <Select value={upgradeCurso} onValueChange={setUpgradeCurso}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cursos</SelectItem>
                  {cursosUpgrade.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-7 flex items-end justify-end gap-2">
              <span className="text-xs text-muted-foreground tabular-nums mr-auto md:mr-2">
                {upgradeFiltrados.length} alunos prontos
              </span>
              <Button
                onClick={() =>
                  exportUpgradeCSV(
                    `upgrade-${new Date().toISOString().slice(0, 10)}.csv`,
                    upgradeFiltrados,
                  )
                }
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={upgradeFiltrados.length === 0}
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </div>

          <UpgradeTable list={upgradeFiltrados} />
        </section>
      )}

      {/* Central de Campanhas Sazonais */}
      <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <header className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Central de Campanhas Sazonais
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Duas ferramentas independentes para extração de listas: campanhas por profissão e
            campanhas de aniversariantes do mês.
          </p>
        </header>

        <Tabs
          value={campanhaTab}
          onValueChange={(v) => setCampanhaTab(v as "profissao" | "aniversario")}
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profissao">Por Profissão</TabsTrigger>
            <TabsTrigger value="aniversario">Aniversariantes</TabsTrigger>
          </TabsList>

          {/* Ferramenta 1 */}
          <TabsContent value="profissao" className="space-y-4 mt-4">
            <div>
              <h3 className="text-base font-semibold">Campanha por Categoria Profissional</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Filtragem e extração de alunos por profissão para campanhas em datas comemorativas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Formação Acadêmica
                </label>
                <Select value={campanhaProfissao} onValueChange={setCampanhaProfissao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a profissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as profissões</SelectItem>
                    {profissoesUnicas.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-7 flex items-end justify-end gap-2">
                <span className="text-xs text-muted-foreground tabular-nums mr-auto md:mr-2">
                  {campanhaProfissaoAlunos.length} alunos elegíveis
                </span>
                <Button
                  onClick={() =>
                    exportProfissaoCSV(
                      `campanha-profissao-${new Date().toISOString().slice(0, 10)}.csv`,
                      campanhaProfissaoAlunos,
                    )
                  }
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={campanhaProfissaoAlunos.length === 0}
                >
                  <Download className="h-4 w-4" /> Exportar CSV
                </Button>
              </div>
            </div>

            <CampanhaTable list={campanhaProfissaoAlunos} />
          </TabsContent>

          {/* Ferramenta 2 */}
          <TabsContent value="aniversario" className="space-y-4 mt-4">
            <div>
              <h3 className="text-base font-semibold">Campanha de Aniversariantes do Mês</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Filtragem e extração de alunos aniversariantes para ofertas exclusivas no mês.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Mês de Aniversário
                </label>
                <Select value={campanhaMes} onValueChange={setCampanhaMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Selecione um mês</SelectItem>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-7 flex items-end justify-end gap-2">
                <span className="text-xs text-muted-foreground tabular-nums mr-auto md:mr-2">
                  {campanhaMes === "all"
                    ? "Selecione um mês para ver os aniversariantes"
                    : `${campanhaAniversariantes.length} aniversariantes elegíveis`}
                </span>
                <Button
                  onClick={() => {
                    const mesLabel =
                      MESES.find((m) => m.value === campanhaMes)?.label.toLowerCase() ?? "mes";
                    exportAniversarioCSV(
                      `aniversariantes-${mesLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
                      campanhaAniversariantes,
                    );
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={campanhaAniversariantes.length === 0}
                >
                  <Download className="h-4 w-4" /> Exportar CSV
                </Button>
              </div>
            </div>

            {campanhaMes === "all" ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Selecione um mês acima para listar os aniversariantes elegíveis.
              </div>
            ) : (
              <CampanhaTable list={campanhaAniversariantes} />
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
          <span className="font-medium text-foreground">Regra de elegibilidade:</span> apenas
          alunos com status{" "}
          <span className="text-primary font-medium">Ativa</span>,{" "}
          <span className="text-primary font-medium">Pré-confirmada</span>,{" "}
          <span className="text-primary font-medium">Concluída</span> ou{" "}
          <span className="text-primary font-medium">Formando</span>. Status{" "}
          <span className="text-destructive font-medium">Cancelada</span> e{" "}
          <span className="text-destructive font-medium">Indeferida</span> são excluídos.
        </div>
      </section>
    </div>
  );
}

function statusBadgeClass(status: string) {
  return status === "Concluída"
    ? "border-info/40 text-info bg-info/10"
    : status === "Formando"
    ? "border-warning/40 text-warning bg-warning/10"
    : status === "Ativa"
    ? "border-primary/40 text-primary bg-primary/10"
    : "border-border text-muted-foreground";
}

function CampanhaTable({ list }: { list: Aluno[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr className="text-muted-foreground">
            <th className="text-left font-medium py-2 px-3">Nome</th>
            <th className="text-left font-medium py-2 px-3">E-mail</th>
            <th className="text-left font-medium py-2 px-3">Telefone</th>
            <th className="text-left font-medium py-2 px-3">Formação Acadêmica</th>
            <th className="text-left font-medium py-2 px-3">Status da Matrícula</th>
          </tr>
        </thead>
        <tbody>
          {list.length > 0 ? (
            list.map((a) => (
              <tr key={a.key} className="border-t border-border/40 hover:bg-muted/30">
                <td className="py-2 px-3 font-medium truncate max-w-[220px]">{a.nome}</td>
                <td className="py-2 px-3 truncate max-w-[240px] text-muted-foreground">
                  {a.email || "—"}
                </td>
                <td className="py-2 px-3 tabular-nums whitespace-nowrap">
                  {formatPhone(a.telefone) || "—"}
                </td>
                <td className="py-2 px-3 text-muted-foreground">{a.formacao || "—"}</td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className={statusBadgeClass(a.status)}>
                    {a.status || "—"}
                  </Badge>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted-foreground">
                Nenhum aluno encontrado com os filtros selecionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UpgradeTable({ list }: { list: Aluno[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr className="text-muted-foreground">
            <th className="text-left font-medium py-2 px-3">Nome</th>
            <th className="text-left font-medium py-2 px-3">E-mail</th>
            <th className="text-left font-medium py-2 px-3">Telefone</th>
            <th className="text-left font-medium py-2 px-3">Curso Concluído</th>
            <th className="text-left font-medium py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.length > 0 ? (
            list.map((a) => (
              <tr key={a.key} className="border-t border-border/40 hover:bg-muted/30">
                <td className="py-2 px-3 font-medium truncate max-w-[220px]">{a.nome}</td>
                <td className="py-2 px-3 truncate max-w-[240px] text-muted-foreground">
                  {a.email || "—"}
                </td>
                <td className="py-2 px-3 tabular-nums whitespace-nowrap">
                  {formatPhone(a.telefone) || "—"}
                </td>
                <td className="py-2 px-3 text-muted-foreground">{cursosLabel(a) || "—"}</td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className={statusBadgeClass(a.status)}>
                    {a.status || "—"}
                  </Badge>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted-foreground">
                Nenhum aluno encontrado para o curso selecionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
