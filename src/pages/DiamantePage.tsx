import { useMemo, useState } from "react";
import { useSheetsData, getCol, allPosRows } from "@/lib/sheets";
import { StatCard } from "@/components/StatCard";
import { ChartCard, HBarChart, TreemapChart, DonutChart, ChartLegend } from "@/components/Charts";
import { Gem, Trophy, Clock, Briefcase, Sparkles, Award, AlertCircle, Download, MessageSquareQuote } from "lucide-react";
import { collectDepoimentos } from "@/lib/depoimentos";
import { DepoimentosCollapsible } from "@/components/Depoimentos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PALETTE, BAR_BASE, BAR_HIGHLIGHT, colorFor, greenRamp } from "@/lib/chartColors";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, LabelList, Cell } from "recharts";

const TEMPO_ORDER = [
  "Menos de 6 meses",
  "6 meses a 1 ano",
  "1 a 2 anos",
  "2 a 3 anos",
  "Mais de 3 anos",
];

function matchTempo(raw: string): string | null {
  const v = (raw || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!v) return null;
  if (v.includes("menos de 6")) return "Menos de 6 meses";
  if (v.includes("6 meses") && v.includes("1 ano")) return "6 meses a 1 ano";
  if (v.includes("1 a 2")) return "1 a 2 anos";
  if (v.includes("2 a 3")) return "2 a 3 anos";
  if (v.includes("mais de 3") || v.includes("3 anos") || v.includes("4 anos") || v.includes("5 anos")) return "Mais de 3 anos";
  return null;
}

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function matchAtuacao(raw: string): string {
  const v = stripAccents(raw);
  if (!v) return "Não informado";
  if (v.includes("autonom") || v.includes("consultor") || /\bpj\b/.test(v)) return "Autônomo / Consultor (PJ)";
  if (v.includes("estagi")) return "Estagiário";
  if (v.includes("trainee")) return "Trainee";
  if (v.includes("servidor") || v.includes("publico")) return "Servidor Público";
  if (v.includes("estudante")) return "Estudante";
  if (v.includes("senior") || v.includes("especialista")) return "Sênior / Especialista";
  if (v.includes("junior") || v.includes("pleno") || v.includes("contratado") || v.includes("clt")) return "Júnior / Pleno";
  return "Outro";
}

export default function DiamantePage() {
  const { data, isLoading } = useSheetsData();

  const k10 = data?.alunos10k ?? [];
  const dia = data?.alunosDiamante ?? [];
  const ficha10k = data?.fichaAlunos10k ?? [];
  const posAll = useMemo(() => (data ? allPosRows(data) : []), [data]);
  const depoimentos = useMemo(() => collectDepoimentos(data), [data]);

  function lookupAtuacao(email: string, ficha: typeof ficha10k, pos: typeof posAll): string {
    if (!email) return "";
    const f = ficha.find((x) => getCol(x, ["Qual o seu e-mail?", "Email", "E-mail"]).trim().toLowerCase() === email);
    if (f) {
      const a = getCol(f, [
        "Qual a sua atuação profissional atualmente?",
        "atuação profissional",
        "atuacao profissional",
      ]);
      if (a) return a;
    }
    const p = pos.find((x) => getCol(x, ["Email", "E-mail"]).trim().toLowerCase() === email);
    if (p) {
      return getCol(p, ["Atuação Profissional", "Atuação", "atuacao profissional"]);
    }
    return "";
  }

  const { formacao10K, naoInformadoAlunos } = useMemo(() => {
    // k10 sheet doesn't have "Formação" — lookup by email in Pós rows and Ficha 10K
    const posByEmail = new Map<string, string>();
    for (const p of posAll) {
      const em = getCol(p, ["E-mail", "Email"]).trim().toLowerCase();
      const f = getCol(p, ["Formação", "Formação Acadêmica"]).trim();
      if (em && f && !posByEmail.has(em)) posByEmail.set(em, f);
    }
    const fichaByEmail = new Map<string, string>();
    for (const f of ficha10k) {
      const em = getCol(f, ["Qual o seu e-mail?", "E-mail", "Email"]).trim().toLowerCase();
      const form = getCol(f, ["Qual a sua principal formação?", "principal formação", "Formação"]).trim();
      if (em && form && !fichaByEmail.has(em)) fichaByEmail.set(em, form);
    }
    const map = new Map<string, number>();
    const naoInf: { nome: string; email: string; curso: string }[] = [];
    for (const r of k10) {
      const em = getCol(r, ["Email", "E-mail"]).trim().toLowerCase();
      let v = posByEmail.get(em) || fichaByEmail.get(em) || getCol(r, ["Formação"]).trim() || "Não informado";
      v = v.trim();
      map.set(v, (map.get(v) ?? 0) + 1);
      if (v === "Não informado") {
        naoInf.push({
          nome: getCol(r, ["Nome"]),
          email: getCol(r, ["Email", "E-mail"]),
          curso: getCol(r, ["Cursos que fez", "Curso", "Cursos"]),
        });
      }
    }
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    return { formacao10K: arr, naoInformadoAlunos: naoInf };
  }, [k10, posAll, ficha10k]);


  const areaAtuacao10K = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of ficha10k) {
      const raw = getCol(r, [
        "Qual a sua principal área de atuação hoje?",
        "principal área de atuação",
        "principal area de atuacao",
      ]);
      const v = (raw || "").trim();
      if (!v) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ficha10k]);

  const tempo10K = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of ficha10k) {
      const raw = getCol(r, [
        "Quanto tempo levou, aproximadamente, para você atingir esse nível de faturamento?",
        "Quanto tempo levou",
        "tempo até alcançar",
      ]);
      const bucket = matchTempo(raw);
      if (!bucket) continue;
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
    }
    return TEMPO_ORDER.filter((k) => map.has(k)).map((name) => ({ name, value: map.get(name)! }));
  }, [ficha10k]);

  const tempoMaisComum = useMemo(() => {
    if (tempo10K.length === 0) return "—";
    return [...tempo10K].sort((a, b) => b.value - a.value)[0].name;
  }, [tempo10K]);

  const totalRespostas = ficha10k.length;

  // Column N — atuação e momento profissional (com fallback na Planilha de Alunos)
  const atuacaoMomento10K = useMemo(() => {
    const posByEmail = new Map<string, string>();
    for (const p of posAll) {
      const em = getCol(p, ["E-mail", "Email"]).trim().toLowerCase();
      const a = getCol(p, ["Atuação Profissional", "Atuação"]);
      if (em && a && !posByEmail.has(em)) posByEmail.set(em, a);
    }
    const map = new Map<string, number>();
    const rows: { nome: string; email: string; bucket: string; raw: string }[] = [];
    for (const r of k10) {
      const em = getCol(r, ["Email", "E-mail"]).trim().toLowerCase();
      const nome = getCol(r, ["Nome"]);
      // Try ficha10k first (col N)
      const f = ficha10k.find((x) => getCol(x, ["Qual o seu e-mail?", "Email", "E-mail"]).trim().toLowerCase() === em);
      let raw = f
        ? getCol(f, [
            "Qual alternativa melhor descreve a sua principal atuação e momento profissional hoje?",
            "principal atuação e momento",
          ])
        : "";
      if (!raw && em) raw = posByEmail.get(em) ?? "";
      const bucket = matchAtuacao(raw);
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
      rows.push({ nome, email: getCol(r, ["Email", "E-mail"]), bucket, raw });
    }
    const dist = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { dist, rows };
  }, [k10, ficha10k, posAll]);

  // Column J — principal virada de chave (apenas opções padronizadas; texto livre vira "Outro")
  const viradaChave = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of ficha10k) {
      const raw = getCol(f, [
        "Qual foi a principal virada de chave na sua trajetória profissional?",
        "principal virada de chave",
        "virada de chave",
      ]).trim();
      if (!raw) continue;
      const parts = raw.split(/\s*;\s*|\s*,\s*(?=[A-ZÀ-Ú])/).map((s) => s.trim()).filter(Boolean);
      for (const p of parts) map.set(p, (map.get(p) ?? 0) + 1);
    }
    // Opções padronizadas = respostas que aparecem em >= 2 fichas. Texto livre isolado vai para "Outro".
    let outro = 0;
    const canonical: { name: string; value: number }[] = [];
    for (const [name, value] of map.entries()) {
      if (value >= 2) canonical.push({ name, value });
      else outro += value;
    }
    canonical.sort((a, b) => b.value - a.value);
    if (outro > 0) canonical.push({ name: "Outro", value: outro });
    return canonical;
  }, [ficha10k]);


  const cursoTopK10 = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of k10) {
      const raw = getCol(r, ["Cursos que fez", "Curso", "Cursos"]);
      if (!raw) continue;
      const parts = raw.split(/[,;|/]| e /i).map((s) => s.trim()).filter(Boolean);
      for (const p of parts) map.set(p, (map.get(p) ?? 0) + 1);
    }
    if (!map.size) return { name: "—", value: 0 };
    const [name, value] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    return { name, value };
  }, [k10]);

  const [naoInfOpen, setNaoInfOpen] = useState(false);

  function exportNaoInformadoCSV() {
    const header = ["Nome", "Email", "Curso"];
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const a of naoInformadoAlunos) {
      lines.push([esc(a.nome), esc(a.email), esc(a.curso)].join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alunos-10k-formacao-nao-informada.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Alunos <span className="text-gradient-brand">10K & Diamante</span>
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Alunos que faturam 10K/mês e alunos Diamante — referências de sucesso da base.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard color="primary" icon={Trophy} label="Alunos 10K/mês" value={k10.length} loading={isLoading} />
        <StatCard color="info" icon={Gem} label="Alunos Diamante" value={dia.length} loading={isLoading} />
        <StatCard color="pink" icon={Sparkles} label="Total destaque" value={k10.length + dia.length} loading={isLoading} />
        <StatCard color="warning" icon={Award} compact label="Curso com mais alunos 10K" value={cursoTopK10.name} hint={cursoTopK10.value ? `${cursoTopK10.value} alunos` : undefined} loading={isLoading} />
      </section>

      <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Insights da Ficha Alunos 10K
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Baseado em {totalRespostas} {totalRespostas === 1 ? "resposta" : "respostas"} da Ficha Alunos 10K (preenchimento em andamento).
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard color="info" label="Tempo mais comum até 10K" value={tempoMaisComum} hint="Faixa com maior frequência" loading={isLoading} />
          <StatCard color="primary" label="Áreas de atuação distintas" value={areaAtuacao10K.length} hint="Diversidade de nichos" loading={isLoading} />
          <StatCard color="pink" label="Respostas coletadas" value={totalRespostas} hint={`de ${k10.length} alunos 10K`} loading={isLoading} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Tempo até alcançar 10K/mês" height={280}>
          <TempoTimeline data={tempo10K} />
        </ChartCard>
        <ChartCard title="Principal área de atuação dos Alunos 10K">
          <TreemapChart data={areaAtuacao10K} />
        </ChartCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4 text-primary" />
              Relatos dos Alunos
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Depoimentos registrados nas planilhas de Alunos 10K/mês, Diamante e Ficha 10K.
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {depoimentos.length} relato{depoimentos.length === 1 ? "" : "s"}
          </span>
        </div>
        <DepoimentosCollapsible items={depoimentos} />
      </section>


      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard
            title="Formação dos Alunos 10K"
            description="Áreas de formação acadêmica — clique em um aluno na lista para identificar quem está sem formação registrada"
            height={420}
            action={
              naoInformadoAlunos.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNaoInfOpen(true)}
                  className="gap-2"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs">
                    {naoInformadoAlunos.length} sem formação
                  </span>
                </Button>
              ) : null
            }
          >
            <HBarChart data={formacao10K} tooltipLabel="Formação" />
          </ChartCard>
        </div>
        <ListCard
          icon={<Clock className="h-4 w-4 text-info" />}
          title="Trajetórias 10K (Ficha)"
          subtitle={`${totalRespostas} respostas`}
          rows={ficha10k.map((r) => ({
            nome: getCol(r, ["Qual o seu nome?", "Nome"]),
            email: getCol(r, ["Qual o seu e-mail?", "Email", "E-mail"]),
            extra: getCol(r, ["Qual a sua principal área de atuação hoje?"]),
            tag: getCol(r, ["Quanto tempo levou, aproximadamente, para você atingir esse nível de faturamento?"]),
          }))}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Principal virada de chave" height={340}>
          {viradaChave.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              Sem respostas preenchidas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 h-full items-center">
              <div className="sm:col-span-2 h-[260px]">
                <DonutChart data={viradaChave} />
              </div>
              <div className="sm:col-span-3">
                <ChartLegend data={viradaChave} />
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Momento profissional dos Alunos 10K" height={340}>
          <MomentoBars data={atuacaoMomento10K.dist} />
        </ChartCard>
      </section>






      <section>
        <Accordion type="multiple" className="space-y-3">
          <AccordionItem value="k10" className="border rounded-2xl bg-card px-5 !border-border">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-base font-semibold">Alunos 10K/mês</span>
                <span className="text-xs text-muted-foreground ml-2">{k10.length} alunos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <AlunosTable
                rows={k10.map((r) => {
                  const email = getCol(r, ["Email", "E-mail"]).trim().toLowerCase();
                  return {
                    nome: getCol(r, ["Nome"]),
                    email: getCol(r, ["Email", "E-mail"]),
                    telefone: getCol(r, ["Telefone", "WhatsApp", "Celular", "Telefone/WhatsApp"]),
                    curso: getCol(r, ["Cursos que fez", "Curso", "Cursos"]),
                    atuacao: lookupAtuacao(email, ficha10k, posAll) || getCol(r, ["Atuação"]),
                  };
                })}
                filename="alunos-10k.csv"
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dia" className="border rounded-2xl bg-card px-5 !border-border">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4 text-info" />
                <span className="text-base font-semibold">Alunos Diamante</span>
                <span className="text-xs text-muted-foreground ml-2">{dia.length} alunos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <AlunosTable
                rows={dia.map((r) => {
                  const email = getCol(r, ["Email", "E-mail"]).trim().toLowerCase();
                  return {
                    nome: getCol(r, ["Nome"]),
                    email: getCol(r, ["Email", "E-mail"]),
                    telefone: getCol(r, ["Telefone", "WhatsApp", "Celular", "Telefone/WhatsApp"]),
                    curso: getCol(r, ["Cursos que fez", "Curso", "Cursos"]),
                    atuacao: lookupAtuacao(email, ficha10k, posAll) || getCol(r, ["Atuação"]),
                  };
                })}
                filename="alunos-diamante.csv"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Dialog open={naoInfOpen} onOpenChange={setNaoInfOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Alunos 10K sem formação registrada
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {naoInformadoAlunos.length} {naoInformadoAlunos.length === 1 ? "aluno" : "alunos"} sem "Formação" preenchida nas planilhas (Pós, Ficha 10K).
              Atualize os cadastros para refinar o gráfico.
            </p>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={exportNaoInformadoCSV}
              disabled={naoInformadoAlunos.length === 0}
              className="gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          </div>
          <div className="max-h-[480px] overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Curso</th>
                </tr>
              </thead>
              <tbody>
                {naoInformadoAlunos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Todos os alunos 10K têm formação registrada.
                    </td>
                  </tr>
                ) : (
                  naoInformadoAlunos.map((a, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{a.nome || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{a.email || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{a.curso || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListCard({
  icon, title, subtitle, rows,
}: { icon: React.ReactNode; title: string; subtitle: string; rows: { nome: string; email: string; extra: string; tag: string }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
        {rows.filter(r => r.nome).map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-2 px-3 rounded-md hover:bg-muted/40 border border-transparent hover:border-border transition">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{r.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{r.email}</p>
              {r.extra && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.extra}</p>}
            </div>
            {r.tag && (
              <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 max-w-[160px] truncate">
                {r.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Barras de progresso (Tempo até 10K) ----------
function TempoTimeline({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem respostas.</div>;
  }
  return (
    <div className="h-full flex flex-col gap-1.5 justify-between">
      {data.map((d, idx) => {
        const pct = (d.value / total) * 100;
        const barColor = greenRamp(idx);
        return (
          <div
            key={d.name}
            className="relative flex-1 min-h-[34px] rounded-lg bg-muted/25 overflow-hidden flex items-center px-3"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-lg transition-all"
              style={{ width: `${Math.max(pct, 2)}%`, background: barColor, opacity: 0.28 }}
            />
            <div className="relative flex items-baseline justify-between gap-3 w-full">
              <p className="text-[13px] font-medium text-foreground/90 truncate">
                {d.name}
                <span className="ml-2 text-[11px] font-normal text-muted-foreground tabular-nums">
                  {d.value}
                </span>
              </p>
              <span
                className="shrink-0 text-xs font-semibold tabular-nums"
                style={{ color: barColor }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ---------- Vertical bars: Momento profissional ----------
function MomentoBars({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={filtered} margin={{ top: 20, right: 12, left: 0, bottom: 72 }} barCategoryGap="22%">
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={84}
          tickMargin={8}
        />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
        <RTooltip
          cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload;
            if (!p?.name) return null;
            return (
              <div className="rounded-md border border-border bg-popover/90 backdrop-blur-md px-3 py-2 text-xs shadow-sm">
                <div className="font-medium text-foreground">{p.name}</div>
                <div className="text-muted-foreground mt-0.5">
                  Alunos: <span className="text-foreground font-semibold">{p.value}</span>
                </div>
              </div>
            );
          }}
        />

        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} barSize={36} fillOpacity={0.85}>
          {filtered.map((d, i) => {
            const max = Math.max(...filtered.map((f) => f.value));
            const isTop = d.value === max;
            const soft = ["hsl(202 45% 66%)", "hsl(224 38% 70%)", "hsl(263 34% 70%)", "hsl(176 30% 60%)", "hsl(292 28% 70%)", "hsl(38 42% 66%)"];
            return (
              <Cell
                key={i}
                fill={isTop ? "hsl(150 38% 62%)" : soft[i % soft.length]}
                fillOpacity={isTop ? 0.9 : 0.7}
              />
            );
          })}
          <LabelList dataKey="value" position="top" style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10.5, fontWeight: 500 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- Accordion table (Alunos 10K / Diamante) ----------
type AlunoRow = { nome: string; email: string; telefone: string; curso: string; atuacao: string };

function AlunosTable({ rows, filename }: { rows: AlunoRow[]; filename: string }) {
  const clean = rows.filter((r) => r.nome);

  function exportCSV() {
    const header = ["Nome", "Email", "Telefone", "Curso"];
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const r of clean) {
      lines.push([esc(r.nome), esc(r.email), esc(r.telefone), esc(r.curso)].join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-4">
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Exportar Contatos (.CSV)
        </Button>
      </div>
      <div className="max-h-[480px] overflow-y-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium">Curso</th>
              <th className="px-3 py-2 font-medium">Atuação</th>
            </tr>
          </thead>
          <tbody>
            {clean.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">Sem alunos.</td>
              </tr>
            ) : (
              clean.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.nome}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.email || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.telefone || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.curso || "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.atuacao ? (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {r.atuacao}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
