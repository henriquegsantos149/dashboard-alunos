import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCol, parseDateBR } from "@/lib/sheets";

type Row = Record<string, string> & { _curso?: string };

export interface AtrasadoItem {
  nome: string;
  curso: string;
  dias: number;
  telefone: string;
}

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function matchStatus(raw: string): string {
  const v = stripAccents(raw);
  if (v.includes("pre-confirm") || v.includes("preconfirm")) return "Pré-confirmada";
  if (v.includes("ativa")) return "Ativa";
  return "";
}

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
  if (d.length === 11) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+${d}`;
}

function csvCell(v: string) {
  const s = (v ?? "").toString().replace(/"/g, '""');
  return `"${s}"`;
}
function csvPhone(raw: string) {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return `""`;
  return `"=""+${digits}"""`;
}

export function computeAtrasados(rows: Row[]): AtrasadoItem[] {
  const now = Date.now();
  const list: AtrasadoItem[] = [];
  for (const r of rows) {
    const status = matchStatus(getCol(r, ["Status de Matrícula"]));
    if (status !== "Ativa" && status !== "Pré-confirmada") continue;

    const diasRaw = getCol(r, ["Dias que faltam para Integralização"]).trim();
    const diasNum = parseInt(diasRaw.replace(/[^\d-]/g, ""), 10);
    const dataFinal = parseDateBR(getCol(r, ["Data Final"]));
    const isNeg = !isNaN(diasNum) && diasRaw.startsWith("-");
    const isPast = dataFinal ? dataFinal.getTime() < now : false;
    if (!isNeg && !isPast) continue;

    let dias = 0;
    if (isNeg) dias = Math.abs(diasNum);
    else if (dataFinal) dias = Math.floor((now - dataFinal.getTime()) / 86400000);

    const nome = getCol(r, ["Aluno(a)", "Nome do Aluno", "Aluno", "Nome"]).trim() || "(sem nome)";
    const telefone = getCol(r, ["Whatsapp", "WhatsApp", "Telefone", "Celular", "Contato"]).trim();
    const curso = (r._curso as string) || "—";

    list.push({ nome, curso, dias, telefone });
  }
  list.sort((a, b) => b.dias - a.dias);
  return list;
}

export function exportAtrasadosCSV(atrasados: AtrasadoItem[]) {
  const header = ["Nome", "Curso", "Telefone"].map(csvCell).join(",");
  const lines = atrasados.map((a) =>
    [csvCell(a.nome), csvCell(a.curso), csvPhone(a.telefone)].join(",")
  );
  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atrasados-integralizacao-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 10;

export function AtrasadosList({ rows }: { rows: Row[] }) {
  const [page, setPage] = useState(1);
  const atrasados = useMemo(() => computeAtrasados(rows), [rows]);

  const totalPages = Math.max(1, Math.ceil(atrasados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = atrasados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (atrasados.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Nenhum aluno atrasado neste filtro.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="text-left font-medium py-2.5 px-4">Nome do Aluno</th>
              <th className="text-left font-medium py-2.5 px-4">Curso</th>
              <th className="text-right font-medium py-2.5 px-4">Dias de Atraso</th>
              <th className="text-left font-medium py-2.5 px-4">Telefone / WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20">
                <td className="py-2.5 px-4 text-foreground">{a.nome}</td>
                <td className="py-2.5 px-4 text-muted-foreground">{a.curso}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  <span className="inline-flex items-center rounded-md bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                    {a.dias} {a.dias === 1 ? "dia" : "dias"}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-muted-foreground">
                  {formatPhone(a.telefone) || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, atrasados.length)} de {atrasados.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
