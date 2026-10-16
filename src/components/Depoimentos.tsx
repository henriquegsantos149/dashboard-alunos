import { useState } from "react";
import { Quote, ChevronDown } from "lucide-react";
import type { Depoimento, DepoimentoGrupo } from "@/lib/depoimentos";
import { groupDepoimentos } from "@/lib/depoimentos";
import { cursoColor } from "@/lib/chartColors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function corDe(grupo: string, origem: string) {
  return grupo === "Aluno Diamante" ? "hsl(202 45% 62%)" : cursoColor(origem) || "hsl(150 38% 58%)";
}

export function DepoimentoCard({ d }: { d: Depoimento }) {
  return <DepoimentoGroupCard g={{ nome: d.nome, email: d.email, origem: d.origem, grupo: d.grupo, itens: [{ texto: d.texto, pergunta: d.pergunta }] }} />;
}

export function DepoimentoGroupCard({ g }: { g: DepoimentoGrupo }) {
  const cor = corDe(g.grupo, g.origem);
  return (
    <figure className="relative rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5 flex flex-col gap-3">
      <Quote className="h-4 w-4 shrink-0 opacity-60" style={{ color: cor }} />
      <div className="space-y-3">
        {g.itens.map((it, i) => (
          <blockquote
            key={i}
            className={cn(
              "text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words",
              i > 0 && "pt-3 border-t border-dashed border-border/60",
            )}
          >
            {it.pergunta && (
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {it.pergunta}
              </span>
            )}
            {it.texto}
          </blockquote>
        ))}
      </div>
      <figcaption className="mt-auto flex items-center gap-3 pt-2 border-t border-border/60">
        <span
          className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-semibold shrink-0"
          style={{ background: cor.replace("hsl(", "hsla(").replace(")", " / 0.18)"), color: cor }}
        >
          {initials(g.nome)}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{g.nome}</span>
          <span className="block text-[11px] text-muted-foreground truncate">
            {g.grupo}
            {g.origem ? ` · ${g.origem}` : ""}
            {g.itens.length > 1 ? ` · ${g.itens.length} relatos` : ""}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function DepoimentosGrid({ items }: { items: Depoimento[] }) {
  const grupos = groupDepoimentos(items);
  if (grupos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        Nenhum relato preenchido nas planilhas.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {grupos.map((g, i) => (
        <DepoimentoGroupCard key={i} g={g} />
      ))}
    </div>
  );
}

export function DepoimentosCollapsible({ items }: { items: Depoimento[] }) {
  const [open, setOpen] = useState(false);
  const grupos = groupDepoimentos(items);
  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen((o) => !o)}>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        {open ? "Ocultar relatos" : `Ver relatos dos alunos 10K (${grupos.length})`}
      </Button>
      {open && <DepoimentosGrid items={items} />}
    </div>
  );
}
