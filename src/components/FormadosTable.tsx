import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Phone,
  Mail,
  Calendar,
  GraduationCap,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCol } from "@/lib/sheets";

type Row = Record<string, string> & { _curso?: string };

export interface FormadoItem {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  curso: string;
  status: "Concluída" | "Formando";
  dataInicio: string;
  dataFinal: string;
  dataInicioRaw: string;
  dataFinalRaw: string;
}

const stripAccents = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function matchConcluidoOuFormando(raw: string): "Concluída" | "Formando" | null {
  const v = stripAccents(raw);
  if (!v) return null;
  if (v.includes("nao conclu")) return null;
  if (v.includes("conclu")) return "Concluída";
  if (v.includes("formando")) return "Formando";
  return null;
}

export function formatDateSimple(raw: string): string {
  if (!raw) return "—";
  const s = raw.trim();
  // dd/mm/yyyy ...
  const m = s.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (m) return m[1];
  // yyyy-mm-dd ...
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[3].padStart(2, "0")}/${iso[2].padStart(2, "0")}/${iso[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return s;
}

function normalizePhone(raw: string) {
  return (raw || "").replace(/\D/g, "");
}

function formatPhone(raw: string) {
  const d = normalizePhone(raw);
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
  return `+${d}`;
}

function csvCell(v: string) {
  const s = (v ?? "").toString().replace(/"/g, '""');
  return `"${s}"`;
}

function csvPhone(raw: string) {
  const formatted = formatPhone(raw);
  if (!formatted) return `""`;
  return csvCell(formatted);
}

export function computeFormados(rows: Row[]): FormadoItem[] {
  const list: FormadoItem[] = [];
  let counter = 0;
  for (const r of rows) {
    const status = matchConcluidoOuFormando(getCol(r, ["Status de Matrícula", "Status"]));
    if (!status) continue;
    const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]).trim() || "(sem nome)";
    const email = getCol(r, ["E-mail", "Email"]).trim();
    const telefone = getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]).trim();
    const curso = (r._curso as string) || getCol(r, ["Nome do Curso", "Curso"]).trim() || "—";
    const dataInicioRaw = getCol(r, ["Data de Início", "Data de Inicio", "Início", "Inicio"]).trim();
    const dataFinalRaw = getCol(r, [
      "Data Final",
      "Data Término",
      "Data Termino",
      "Término",
      "Termino",
      "Fim",
    ]).trim();

    list.push({
      id: `${email || nome}-${curso}-${++counter}`,
      nome,
      email,
      telefone,
      curso,
      status,
      dataInicio: formatDateSimple(dataInicioRaw),
      dataFinal: formatDateSimple(dataFinalRaw),
      dataInicioRaw,
      dataFinalRaw,
    });
  }
  list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return list;
}

export function exportFormadosCSV(formados: FormadoItem[], filename?: string) {
  const header = [
    "Nome",
    "E-mail",
    "Telefone",
    "Pós-Graduação",
    "Status",
    "Data de Início",
    "Data Final",
  ]
    .map(csvCell)
    .join(",");

  const lines = formados.map((a) =>
    [
      csvCell(a.nome),
      csvCell(a.email),
      csvPhone(a.telefone),
      csvCell(a.curso),
      csvCell(a.status),
      csvCell(a.dataInicio !== "—" ? a.dataInicio : ""),
      csvCell(a.dataFinal !== "—" ? a.dataFinal : ""),
    ].join(",")
  );

  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename || `alunos-concluidos-e-formando-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 12;

export function FormadosList({ rows }: { rows: Row[] }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Concluída" | "Formando">("all");
  const [cursoFilter, setCursoFilter] = useState<string>("all");

  const allFormados = useMemo(() => computeFormados(rows), [rows]);

  const cursosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const item of allFormados) {
      if (item.curso && item.curso !== "—") set.add(item.curso);
    }
    return Array.from(set).sort();
  }, [allFormados]);

  const counts = useMemo(() => {
    const concluidas = allFormados.filter((a) => a.status === "Concluída").length;
    const formando = allFormados.filter((a) => a.status === "Formando").length;
    return { total: allFormados.length, concluidas, formando };
  }, [allFormados]);

  const filtered = useMemo(() => {
    const q = stripAccents(query);
    return allFormados.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (cursoFilter !== "all" && a.curso !== cursoFilter) return false;
      if (!q) return true;
      return (
        stripAccents(a.nome).includes(q) ||
        stripAccents(a.email).includes(q) ||
        normalizePhone(a.telefone).includes(q.replace(/\D/g, "")) ||
        stripAccents(a.curso).includes(q) ||
        a.dataInicio.includes(q) ||
        a.dataFinal.includes(q)
      );
    });
  }, [allFormados, query, statusFilter, cursoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExportFiltered = () => {
    const suffix = statusFilter === "all" ? "todos" : stripAccents(statusFilter);
    exportFormadosCSV(
      filtered,
      `alunos-pos-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, e-mail, telefone..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Status */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
                {counts.total}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("Concluída");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                statusFilter === "Concluída"
                  ? "bg-background text-emerald-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Concluída
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-normal">
                {counts.concluidas}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("Formando");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                statusFilter === "Formando"
                  ? "bg-background text-sky-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3 w-3 text-sky-400" />
              Formando
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-400 font-normal">
                {counts.formando}
              </span>
            </button>
          </div>

          {/* Filtro por Pós (se houver mais de um curso na lista) */}
          {cursosDisponiveis.length > 1 && (
            <select
              value={cursoFilter}
              onChange={(e) => {
                setCursoFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-2.5 py-1 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas as Pós ({cursosDisponiveis.length})</option>
              {cursosDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Botão de Exportar */}
          <Button
            size="sm"
            onClick={handleExportFiltered}
            disabled={filtered.length === 0}
            className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV ({filtered.length})</span>
          </Button>
        </div>
      </div>

      {/* Tabela de Alunos */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="text-left font-medium py-2.5 px-3">Nome do Aluno</th>
                <th className="text-left font-medium py-2.5 px-3">E-mail</th>
                <th className="text-left font-medium py-2.5 px-3">WhatsApp / Telefone</th>
                <th className="text-left font-medium py-2.5 px-3">Pós-Graduação</th>
                <th className="text-left font-medium py-2.5 px-3">Status</th>
                <th className="text-left font-medium py-2.5 px-3">Início</th>
                <th className="text-left font-medium py-2.5 px-3">Data Final</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum aluno encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                pageItems.map((a) => {
                  const rawDigits = normalizePhone(a.telefone);
                  const waNumber = rawDigits.length <= 11 ? `55${rawDigits}` : rawDigits;
                  const waLink = rawDigits ? `https://wa.me/${waNumber}` : "";

                  return (
                    <tr
                      key={a.id}
                      className="border-t border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[200px]">
                        {a.nome}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[220px]">
                        {a.email || "—"}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                        {rawDigits ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                            title="Abrir conversa no WhatsApp"
                          >
                            <Phone className="h-3 w-3 text-primary shrink-0" />
                            {formatPhone(a.telefone)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground">
                          {a.curso}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {a.status === "Concluída" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Concluída
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-400 border-sky-500/30">
                            <Clock className="h-3 w-3" />
                            Formando
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-muted-foreground whitespace-nowrap">
                        {a.dataInicio}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-muted-foreground whitespace-nowrap">
                        {a.dataFinal}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-card/40 text-xs text-muted-foreground">
            <span>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} alunos
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
