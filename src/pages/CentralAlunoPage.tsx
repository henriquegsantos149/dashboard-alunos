import { useMemo, useState } from "react";
import { Search, User, Mail, Phone, GraduationCap, Briefcase, Wallet, BookOpen, Clock, Calendar, FileText } from "lucide-react";
import { useSheetsData, allPosRows, getCol, parseDateBR, daysSince } from "@/lib/sheets";
import oldFormDataRaw from "@/data/oldForm.json";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cursoColor } from "@/lib/chartColors";
import { collectDepoimentos, type Depoimento } from "@/lib/depoimentos";
import { DepoimentoCard } from "@/components/Depoimentos";
import { MessageSquareQuote } from "lucide-react";

const oldFormData = oldFormDataRaw as Record<string, string>[];

const stripAccents = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const looseKey = (s: string) => stripAccents(s).replace(/[^a-z0-9]/g, "");
const normEmail = (s: string) => (s || "").toLowerCase().trim();
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

function sanitize(s: string): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function formatPhone(raw: string) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    const rest = d.slice(2);
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    const mid = num.length === 9 ? num.slice(0, 5) : num.slice(0, 4);
    const end = num.length === 9 ? num.slice(5) : num.slice(4);
    return `+55 (${ddd}) ${mid}-${end}`;
  }
  if (d.length === 11) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
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
  return raw || "";
}

const STATUS_COLOR: Record<string, string> = {
  "Ativa": "bg-info/15 text-info border-info/30",
  "Pré-confirmada": "bg-warning/15 text-warning border-warning/30",
  "Concluída": "bg-primary/15 text-primary border-primary/30",
  "Formando": "bg-primary/15 text-primary border-primary/30",
  "Cancelada": "bg-destructive/15 text-destructive border-destructive/30",
  "Indeferida": "bg-destructive/15 text-destructive border-destructive/30",
  "Não concluída": "bg-muted text-muted-foreground border-border",
};

type CursoItem = {
  tipo: "Pós-Graduação" | "Extensão";
  nome: string;
  status?: string;
  dataInicio?: string;
  ultimoAcessoDias?: number | null;
};

type Perfil = {
  key: string;
  nome: string;
  email: string;
  telefone: string;
  formacao: string;
  atuacao: string;
  renda: string;
  ehSomenteExtensao: boolean;
  cursos: CursoItem[];
  ultimoAcessoDias: number | null;
  observacao: string;
};

const FALLBACK = "Não informado (Histórico de Extensão)";
const NI = "Não informado";

export default function CentralAlunoPage() {
  const { data, isLoading } = useSheetsData();
  const [query, setQuery] = useState("");

  const depoimentos = useMemo(() => collectDepoimentos(data), [data]);

  const perfis = useMemo<Perfil[]>(() => {
    if (!data) return [];

    const byKey = new Map<string, Perfil>();
    const emailIndex = new Map<string, string>(); // email -> key
    const nameIndex = new Map<string, string>(); // nameKey -> key

    function resolveKey(email: string, nome: string): string {
      const ek = email ? normEmail(email) : "";
      const nk = nome ? looseKey(nome) : "";
      if (ek && emailIndex.has(ek)) return emailIndex.get(ek)!;
      if (!ek && nk && nameIndex.has(nk)) return nameIndex.get(nk)!;
      const key = ek ? "e:" + ek : "n:" + nk;
      if (ek) emailIndex.set(ek, key);
      if (nk) nameIndex.set(nk, key);
      return key;
    }

    function ensure(email: string, nome: string): Perfil {
      const key = resolveKey(email, nome);
      let p = byKey.get(key);
      if (!p) {
        p = {
          key,
          nome: sanitize(nome) || "(sem nome)",
          email: normEmail(email),
          telefone: "",
          formacao: "",
          atuacao: "",
          renda: "",
          ehSomenteExtensao: true,
          cursos: [],
          ultimoAcessoDias: null,
          observacao: "",
        };
        byKey.set(key, p);
      } else {
        if (!p.nome || p.nome === "(sem nome)") p.nome = sanitize(nome) || p.nome;
        if (!p.email && email) p.email = normEmail(email);
      }
      return p;
    }

    // 1) Pós/MBA — fonte primária dos cursos de pós
    for (const r of allPosRows(data)) {
      const curso = (r as any)._curso as string;
      const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]).trim();
      const email = getCol(r, ["E-mail", "Email"]).trim();
      const tel = getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]).trim();
      const status = matchStatus(getCol(r, ["Status de Matrícula"]));
      const inicioRaw = getCol(r, ["Data de Início", "Data de início", "Início", "Data de Matrícula"]).trim();
      const ultAcessoDate = parseDateBR(getCol(r, ["Último Acesso", "Último acesso"]));
      const ultDias = daysSince(ultAcessoDate);
      const formacao = getCol(r, ["Formação", "Formação Acadêmica"]);
      const observacao = getCol(r, ["Observação", "Observacao", "Observações"]).trim();
      if (!nome && !email) continue;
      const p = ensure(email, nome);
      if (!p.telefone) p.telefone = formatPhone(tel);
      if (!p.formacao && formacao) p.formacao = sanitize(formacao);
      if (observacao && observacao.length > (p.observacao?.length ?? 0)) p.observacao = observacao;
      p.ehSomenteExtensao = false;
      p.cursos.push({
        tipo: "Pós-Graduação",
        nome: curso,
        status,
        dataInicio: inicioRaw,
        ultimoAcessoDias: ultDias,
      });
      if (ultDias !== null && (p.ultimoAcessoDias === null || ultDias < p.ultimoAcessoDias)) {
        p.ultimoAcessoDias = ultDias;
      }
    }

    // 2) Ficha de Matrícula (Pós + Extensão) — cadastro + curso indicado
    const fichas = [
      ...data.fichaMatricula.map((r) => ({ r, src: "ficha" as const })),
      ...data.formados.map((r) => ({ r, src: "formados" as const })),
      ...oldFormData.map((r) => ({ r, src: "old" as const })),
    ];
    for (const { r } of fichas) {
      const email = getCol(r, [
        "Qual o e-mail que você utilizou na sua matrícula?",
        "Qual o e-mail que você utilizou em sua matrícula?",
        "E-mail",
        "Email",
      ]).trim();
      const nome = getCol(r, ["Qual o seu nome?", "Nome"]).trim();
      if (!email && !nome) continue;
      const tel = getCol(r, [
        "Qual o seu Whatsapp (com DDD)?",
        "Qual é o seu Whatsapp (com DDD)?",
        "Whatsapp",
        "WhatsApp",
        "Telefone",
        "Celular",
        "Contato",
      ]);
      const renda = getCol(r, [
        "Para entendermos melhor o perfil dos nossos alunos, qual faixa de renda mensal mais se aproxima da sua realidade atualmente?",
        "faixa de renda",
      ]);
      const atuacao = getCol(r, [
        "Qual alternativa melhor descreve a sua principal atuação e momento profissional hoje?",
        "principal atuação",
        "Atuação",
      ]);
      const formacao = getCol(r, [
        "Qual a sua formação acadêmica?",
        "Qual sua formação acadêmica?",
        "Formação acadêmica",
        "Formação Acadêmica",
        "Formação",
      ]);
      const formacaoMatricula = getCol(r, [
        "Você se matriculou em qual das nossas formações?",
        "Você se matriculou em qual das nossas formações",
        "qual das nossas formações",
      ]);

      const p = ensure(email, nome);
      if (!p.telefone) p.telefone = formatPhone(tel);
      if (!p.formacao && formacao) p.formacao = sanitize(formacao);
      if (!p.atuacao && atuacao) p.atuacao = sanitize(atuacao);
      if (!p.renda && renda) p.renda = renda.trim();

      if (formacaoMatricula) {
        const nLower = stripAccents(formacaoMatricula);
        const isPos =
          nLower.includes("pos-grad") ||
          nLower.includes("pos grad") ||
          nLower.includes("mba");
        const tipo: "Pós-Graduação" | "Extensão" = isPos ? "Pós-Graduação" : "Extensão";
        // Dedup: não adicionar pós duplicada que já veio das planilhas oficiais
        const exists = p.cursos.some(
          (c) => stripAccents(c.nome) === nLower || (tipo === "Pós-Graduação" && c.tipo === "Pós-Graduação"),
        );
        if (!exists) {
          p.cursos.push({ tipo, nome: formacaoMatricula.trim() });
          if (tipo === "Pós-Graduação") p.ehSomenteExtensao = false;
        } else if (tipo === "Extensão") {
          // ainda assim, garantir presença da extensão única
          const extExists = p.cursos.some(
            (c) => c.tipo === "Extensão" && stripAccents(c.nome) === nLower,
          );
          if (!extExists) p.cursos.push({ tipo, nome: formacaoMatricula.trim() });
        }
      }
    }

    return Array.from(byKey.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [data]);

  const resultados = useMemo(() => {
    const q = stripAccents(query);
    const qDigits = onlyDigits(query);
    if (!q && !qDigits) return [];
    return perfis
      .filter((p) => {
        if (qDigits && qDigits.length >= 4 && onlyDigits(p.telefone).includes(qDigits)) return true;
        if (!q) return false;
        return (
          stripAccents(p.nome).includes(q) ||
          stripAccents(p.email).includes(q)
        );
      })
      .slice(0, 50);
  }, [perfis, query]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = useMemo(
    () => perfis.find((p) => p.key === selectedKey) || null,
    [perfis, selectedKey],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Central do <span className="text-gradient-brand">Aluno</span>
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Consulte o histórico completo, perfil profissional e o progresso acadêmico de qualquer aluno da base de forma individual.
        </p>
      </div>

      {/* Search */}
      <section className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedKey(null);
            }}
            placeholder={isLoading ? "Carregando base de alunos…" : "Busque por Nome, E-mail ou Telefone…"}
            className="pl-9 h-11"
            disabled={isLoading}
          />
        </div>

        {query && (
          <div className="mt-3 text-xs text-muted-foreground">
            {resultados.length === 0
              ? "Nenhum aluno encontrado."
              : `${resultados.length} resultado${resultados.length > 1 ? "s" : ""} — clique para abrir o perfil.`}
          </div>
        )}

        {resultados.length > 0 && !selected && (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border overflow-hidden">
            {resultados.map((p) => (
              <li key={p.key}>
                <button
                  onClick={() => setSelectedKey(p.key)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.email || "sem e-mail"} {p.telefone && `· ${p.telefone}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.cursos.slice(0, 3).map((c, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          color: c.tipo === "Pós-Graduação" ? cursoColor(c.nome) : undefined,
                          borderColor: c.tipo === "Pós-Graduação" ? cursoColor(c.nome) + "55" : undefined,
                        }}
                      >
                        {c.tipo === "Pós-Graduação" ? c.nome : "Extensão"}
                      </Badge>
                    ))}
                    {p.cursos.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{p.cursos.length - 3}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <PerfilDetalhe
          perfil={selected}
          depoimentos={depoimentos.filter(
            (d) =>
              (d.email && d.email === selected.email) ||
              looseKey(d.nome) === looseKey(selected.nome),
          )}
          onClose={() => setSelectedKey(null)}
        />
      )}

      {!query && !isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <User className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground">
            Use a busca acima para localizar um aluno e visualizar sua jornada completa.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Base unificada: {perfis.length.toLocaleString("pt-BR")} alunos consolidados por e-mail.
          </p>
        </div>
      )}
    </div>
  );
}

function PerfilDetalhe({
  perfil,
  depoimentos,
  onClose,
}: {
  perfil: Perfil;
  depoimentos: Depoimento[];
  onClose: () => void;
}) {
  const extensao = perfil.ehSomenteExtensao;
  const show = (v: string) => v?.trim() ? v : extensao ? FALLBACK : NI;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{perfil.nome}</h2>
          <p className="text-xs text-muted-foreground">
            {perfil.email || "sem e-mail cadastrado"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          ← voltar para busca
        </button>
      </div>

      {/* Painel Cadastral */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-primary" /> Quem é o Aluno?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field icon={User} label="Nome" value={perfil.nome} />
          <Field icon={Mail} label="E-mail" value={perfil.email || NI} />
          <Field icon={Phone} label="Telefone" value={perfil.telefone || NI} />
          <Field icon={GraduationCap} label="Formação" value={show(perfil.formacao)} />
          <Field icon={Briefcase} label="Atuação" value={show(perfil.atuacao)} />
          <Field icon={Wallet} label="Renda" value={show(perfil.renda)} />
        </div>
        {extensao && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            ⓘ Aluno presente apenas em cursos de extensão. Dados cadastrais podem estar parciais por se tratar de ficha recente.
          </p>
        )}
      </div>

      {/* Apresentação do Aluno */}
      <ApresentacaoCard texto={perfil.observacao} />

      {depoimentos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-primary" /> Relatos do Aluno (10K / Diamante)
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {depoimentos.length} relato{depoimentos.length === 1 ? "" : "s"}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {depoimentos.map((d, i) => (
              <DepoimentoCard key={i} d={d} />
            ))}
          </div>
        </div>
      )}



      {/* Jornada Acadêmica */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-primary" /> Jornada Acadêmica
          <span className="ml-auto text-xs text-muted-foreground">
            {perfil.cursos.length} produto{perfil.cursos.length !== 1 ? "s" : ""} da casa
          </span>
        </h3>
        {perfil.cursos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum curso encontrado para este aluno.</p>
        ) : (
          <ul className="space-y-3">
            {perfil.cursos.map((c, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/40 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={
                        c.tipo === "Pós-Graduação"
                          ? { color: cursoColor(c.nome), borderColor: cursoColor(c.nome) + "55" }
                          : { color: "hsl(var(--info))", borderColor: "hsl(var(--info) / 0.4)" }
                      }
                    >
                      {c.tipo}
                    </Badge>
                    <span className="font-medium text-sm">{c.nome}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {c.dataInicio && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Início: {c.dataInicio}
                      </span>
                    )}
                    {c.ultimoAcessoDias !== null && c.ultimoAcessoDias !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Último acesso: {c.ultimoAcessoDias}d
                      </span>
                    )}
                    {c.ultimoAcessoDias !== null && c.ultimoAcessoDias <= 15 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-success/15 text-success border border-success/30 px-1.5 py-0.5 font-medium">
                        Engajado
                      </span>
                    )}
                  </div>
                </div>
                {c.status && (
                  <span
                    className={`shrink-0 px-2 py-1 rounded-md border text-[11px] font-medium ${
                      STATUS_COLOR[c.status] ?? "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {c.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Engajamento */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-primary" /> Métricas de Engajamento
        </h3>
        <Field
          icon={Clock}
          label="Último acesso (consolidado)"
          value={
            perfil.ultimoAcessoDias === null
              ? extensao
                ? FALLBACK
                : NI
              : `${perfil.ultimoAcessoDias} dias atrás`
          }
        />
      </div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const isPlaceholder = value === FALLBACK || value === NI || value.startsWith("Rastreamento");
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p
          className={`text-sm break-words ${isPlaceholder ? "text-muted-foreground italic" : "font-medium"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ApresentacaoCard({ texto }: { texto: string }) {
  const [expanded, setExpanded] = useState(false);
  const clean = (texto || "").trim();
  const isLong = clean.length > 240 || clean.split(/\n/).length > 4;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-primary" /> Apresentação do Aluno
        <span className="text-[10px] font-normal text-muted-foreground ml-1">
          (Perfil profissional relatado)
        </span>
      </h3>
      {clean ? (
        <>
          <p
            className={`text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words ${
              !expanded && isLong ? "line-clamp-4" : ""
            }`}
          >
            {clean}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Nenhum dado de apresentação cadastrado para este aluno.
        </p>
      )}
    </div>
  );
}
