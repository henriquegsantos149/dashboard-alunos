import { useMemo, useState } from "react";
import { Cake, GraduationCap, Users, Briefcase } from "lucide-react";
import { useSheetsData, getCol, allPosRows, type AlunoRow } from "@/lib/sheets";
import { ChartCard, HBarChart } from "@/components/Charts";
import { GenderViz } from "@/components/GenderViz";
import { RendaViz } from "@/components/RendaViz";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type ExtKey = "all" | "pap" | "f2w" | "geodev" | "workshop";

const EXT_LABEL: Record<ExtKey, string> = {
  all: "Todos os cursos livres",
  pap: "Programa Ambiental Pro (PAP)",
  f2w: "Formação em WebGIS e WebAPPS (F2W)",
  geodev: "Python GeoDev",
  workshop: "Workshop WebGIS na Prática",
};

const EXT_KEYWORDS: Record<Exclude<ExtKey, "all">, string[]> = {
  pap: ["programa ambiental pro", "(pap)", " pap"],
  f2w: ["webgis e webapps", "(f2w)", "f2w"],
  geodev: ["python geodev", "geodev"],
  workshop: ["workshop webgis", "workshop"],
};

function matchExt(raw: string, key: ExtKey): boolean {
  const v = stripAccents(raw);
  if (!v) return false;
  if (key === "all") {
    return Object.values(EXT_KEYWORDS).some((kws) => kws.some((k) => v.includes(k)));
  }
  return EXT_KEYWORDS[key].some((k) => v.includes(k));
}

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
];

function matchFormacao(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "Outro";
  if (v.includes("ambiental")) return "Engenharia Ambiental";
  if (v.includes("florestal")) return "Engenharia Florestal";
  if (v.includes("agronom")) return "Engenharia Agronômica";
  if (v.includes("civil")) return "Engenharia Civil";
  if (v.includes("geografia")) return "Geografia";
  if (v.includes("geologia")) return "Geologia";
  if (v.includes("biolog")) return "Ciências Biológicas";
  if (v.includes("meteorolog")) return "Meteorologia";
  if (v.includes("oceanograf")) return "Oceanografia";
  if (v.includes("sistemas de informa") || /\bti\b/.test(v)) return "Sistemas de Informação (TI)";
  if (v.includes("arquitetura") || v.includes("urbanismo")) return "Arquitetura e Urbanismo";
  if (v.includes("ainda nao") || v.includes("cursando") || v.includes("graduando")) return "Ainda não sou formado";
  return "Outro";
}

function matchGenero(raw: string): string {
  const v = stripAccents(raw);
  if (v.includes("masc")) return "Masculino";
  if (v.includes("fem")) return "Feminino";
  if (!v) return "";
  return "Outro";
}

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

export default function ExtensaoPage() {
  const { data, isLoading } = useSheetsData();
  const [filter, setFilter] = useState<ExtKey>("all");

  const rows: AlunoRow[] = useMemo(() => {
    if (!data) return [];
    const src = data.fichaMatricula ?? [];
    return src.filter((r) =>
      matchExt(getCol(r, ["Você se matriculou em qual das nossas formações?", "qual das nossas formações"]), filter),
    );
  }, [data, filter]);

  const total = rows.length;

  const idade = useMemo(() => {
    const ages: number[] = [];
    for (const r of rows) {
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
  }, [rows]);

  const generoData = useMemo(() => {
    const map = new Map<string, number>();
    map.set("Feminino", 0);
    map.set("Masculino", 0);
    map.set("Outro", 0);
    for (const r of rows) {
      const g = matchGenero(getCol(r, ["Qual o seu gênero?", "Gênero"]));
      if (!g) continue;
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return ["Feminino", "Masculino", "Outro"]
      .map((name) => ({ name, value: map.get(name) ?? 0 }))
      .filter((d) => d.value > 0);
  }, [rows]);

  const atuacaoData = useMemo(() => {
    // Cross-reference atuacao data across all fichas + pos rows (by email)
    const atuacaoByEmail = new Map<string, string>();
    if (data) {
      const allFichas = data.fichaMatricula ?? [];
      for (const f of allFichas) {
        const em = getCol(f, ["Qual o e-mail que você utilizou na sua matrícula?", "E-mail", "Email"]).trim().toLowerCase();
        const a = matchAtuacao(getCol(f, [
          "Qual alternativa melhor descreve a sua principal atuação e momento profissional hoje?",
          "principal atuação",
          "Atuação",
        ]));
        if (em && a && a !== "Outro" && !atuacaoByEmail.has(em)) atuacaoByEmail.set(em, a);
      }
      for (const p of allPosRows(data)) {
        const em = getCol(p, ["E-mail", "Email"]).trim().toLowerCase();
        const a = matchAtuacao(getCol(p, ["Atuação Profissional", "Atuação"]));
        if (em && a && a !== "Outro" && !atuacaoByEmail.has(em)) atuacaoByEmail.set(em, a);
      }
    }

    const map = new Map<string, number>();
    for (const opt of ATUACAO_OPTIONS) map.set(opt, 0);
    let semInfo = 0;
    for (const r of rows) {
      const raw = getCol(r, [
        "Qual alternativa melhor descreve a sua principal atuação e momento profissional hoje?",
        "principal atuação",
        "Atuação",
      ]);
      let b = raw ? matchAtuacao(raw) : "";
      if (!b) {
        const em = getCol(r, ["Qual o e-mail que você utilizou na sua matrícula?", "E-mail", "Email"]).trim().toLowerCase();
        if (em && atuacaoByEmail.has(em)) b = atuacaoByEmail.get(em)!;
      }
      if (b && map.has(b)) map.set(b, (map.get(b) ?? 0) + 1);
      else semInfo += 1;
    }
    const arr = ATUACAO_OPTIONS.map((name) => ({ name, value: map.get(name) ?? 0 })).filter((d) => d.value > 0);
    if (semInfo > 0) arr.push({ name: "Não informado", value: semInfo });
    return arr;
  }, [rows, data]);


  const formacaoData = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of FORMACAO_OPTIONS) map.set(opt, 0);
    for (const r of rows) {
      const b = matchFormacao(getCol(r, ["Qual a sua principal formação?", "Formação", "Graduação"]));
      if (map.has(b)) map.set(b, (map.get(b) ?? 0) + 1);
    }
    return FORMACAO_OPTIONS.map((name) => ({ name, value: map.get(name) ?? 0 })).filter((d) => d.value > 0);
  }, [rows]);

  const rendaData = useMemo(() => {
    const map = new Map<string, number>();
    for (const opt of RENDA_OPTIONS) map.set(opt, 0);
    for (const r of rows) {
      const b = matchRenda(getCol(r, [
        "Para entendermos melhor o perfil dos nossos alunos, qual faixa de renda mensal mais se aproxima da sua realidade atualmente?",
        "faixa de renda",
      ]));
      if (b && map.has(b)) map.set(b, (map.get(b) ?? 0) + 1);
    }
    return RENDA_OPTIONS.map((name) => ({ name, value: map.get(name) ?? 0 })).filter((d) => d.value > 0);
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="text-foreground">Cursos de Extensão </span>
            <span className="text-gradient-brand">& Livres</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Perfil dos alunos de PAP, F2W, Python GeoDev e Workshop WebGIS — baseado nas Fichas de Matrícula.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as ExtKey)}>
          <TabsList className="bg-muted/50 flex-wrap h-auto">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pap">PAP</TabsTrigger>
            <TabsTrigger value="f2w">F2W</TabsTrigger>
            <TabsTrigger value="geodev">Python GeoDev</TabsTrigger>
            <TabsTrigger value="workshop">Workshop WebGIS</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard color="primary" icon={Cake} label="Idade Média" value={idade.count > 0 ? idade.avg.toFixed(1) : "—"} hint={`${idade.count} respostas`} loading={isLoading} />
        <StatCard color="pink" icon={Users} label="Gênero" value={(() => { const f = generoData.find((d) => d.name === "Feminino")?.value ?? 0; const m = generoData.find((d) => d.name === "Masculino")?.value ?? 0; const t = f + m + (generoData.find((d) => d.name === "Outro")?.value ?? 0); if (!t) return "—"; return `${Math.round((f / t) * 100)}%F · ${Math.round((m / t) * 100)}%M`; })()} hint="Distribuição informada" loading={isLoading} />
        <StatCard color="warning" icon={Briefcase} label="Categorias de Atuação" value={atuacaoData.length} hint="Perfis distintos" loading={isLoading} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Idade dos Alunos" description="Distribuição etária" height={340}>
          {idade.count > 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-14 w-14 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                  <Cake className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gradient-brand tabular-nums leading-none">
                      {idade.avg.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">anos (média)</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Mín <span className="text-foreground font-medium">{idade.min}</span> · Máx{" "}
                    <span className="text-foreground font-medium">{idade.max}</span> · Base{" "}
                    <span className="text-foreground font-medium">{idade.count}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end gap-1.5 pt-2">
                {(() => {
                  const max = Math.max(...idade.buckets.map((b) => b.value), 1);
                  return idade.buckets.map((b) => {
                    const pct = idade.count > 0 ? (b.value / idade.count) * 100 : 0;
                    const w = (b.value / max) * 100;
                    return (
                      <div key={b.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-12 text-muted-foreground tabular-nums shrink-0">{b.name}</span>
                        <div className="flex-1 h-3 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                            style={{ width: `${w}%` }}
                          />
                        </div>
                        <span className="w-20 text-right tabular-nums text-foreground font-medium shrink-0">
                          {b.value}{" "}
                          <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Gênero" description="Distribuição por gênero (Ficha de Matrícula)" height={340}>
          <GenderViz data={generoData} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(() => {
          const responded = atuacaoData
            .filter((d) => d.name !== "Não informado")
            .reduce((s, d) => s + d.value, 0);
          if (responded <= 1) {
            return (
              <ChartCard title="Atuação Profissional" description="Categorias padronizadas" height={380}>
                <div className="h-full grid place-items-center text-xs text-muted-foreground text-center px-4">
                  {isLoading
                    ? "Carregando…"
                    : `Sem dados suficientes de atuação para este curso (${responded} ${responded === 1 ? "resposta" : "respostas"}).`}
                </div>
              </ChartCard>
            );
          }
          return (
            <ChartCard title="Atuação Profissional" description="Categorias padronizadas (inclui alunos sem informação)" height={380}>
              <HBarChart data={atuacaoData} tooltipLabel="Atuação" />
            </ChartCard>
          );
        })()}
        <ChartCard title="Formação Acadêmica" description="Áreas de formação" height={380}>
          {formacaoData.length > 0 ? (
            <HBarChart data={formacaoData} tooltipLabel="Formação" />
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados"}
            </div>
          )}
        </ChartCard>
      </section>

      <section className="grid grid-cols-1">
        <ChartCard title="Faixa de Renda Mensal" description="Alunos de Extensão & Cursos Livres" height={340}>
          {rendaData.length > 0 ? (
            <RendaViz data={rendaData} />
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : "Sem dados de renda para este curso"}
            </div>
          )}
        </ChartCard>
      </section>


    </div>
  );
}
