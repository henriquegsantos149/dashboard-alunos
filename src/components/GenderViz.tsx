import { User, Users } from "lucide-react";

type Item = { name: string; value: number };

export function GenderViz({ data }: { data: Item[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  const get = (n: string) => data.find((d) => d.name === n)?.value ?? 0;
  const masc = get("Masculino");
  const fem = get("Feminino");
  const outro = get("Outro") + get("Não identificado");
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  const Person = ({ color, fill }: { color: string; fill: number }) => (
    <div className="relative w-16 h-28">
      {/* base outline */}
      <svg
        viewBox="0 0 64 112"
        className="absolute inset-0 w-full h-full text-muted/40"
        fill="currentColor"
        stroke="hsl(var(--foreground) / 0.55)"
        strokeWidth={1.2}
        strokeLinejoin="round"
      >
        <circle cx="32" cy="16" r="12" />
        <path d="M16 44 Q16 36 24 36 H40 Q48 36 48 44 V80 H40 V108 H24 V80 H16 Z" />
      </svg>
      {/* filled portion clipped from bottom */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(${100 - fill}% 0 0 0)` }}
      >
        <svg
          viewBox="0 0 64 112"
          className="w-full h-full"
          fill={color}
          stroke="hsl(var(--foreground) / 0.55)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        >
          <circle cx="32" cy="16" r="12" />
          <path d="M16 44 Q16 36 24 36 H40 Q48 36 48 44 V80 H40 V108 H24 V80 H16 Z" />
        </svg>
      </div>
    </div>
  );

  const PersonF = ({ color, fill }: { color: string; fill: number }) => (
    <div className="relative w-16 h-28">
      <svg
        viewBox="0 0 64 112"
        className="absolute inset-0 w-full h-full text-muted/40"
        fill="currentColor"
        stroke="hsl(var(--foreground) / 0.55)"
        strokeWidth={1.2}
        strokeLinejoin="round"
      >
        <circle cx="32" cy="16" r="12" />
        <path d="M20 44 Q20 36 28 36 H36 Q44 36 44 44 L52 78 H40 V108 H24 V78 H12 Z" />
      </svg>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(${100 - fill}% 0 0 0)` }}
      >
        <svg
          viewBox="0 0 64 112"
          className="w-full h-full"
          fill={color}
          stroke="hsl(var(--foreground) / 0.55)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        >
          <circle cx="32" cy="16" r="12" />
          <path d="M20 44 Q20 36 28 36 H36 Q44 36 44 44 L52 78 H40 V108 H24 V78 H12 Z" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="flex items-end justify-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <Person color="hsl(210 42% 63%)" fill={pct(masc)} />
          <div className="text-2xl font-bold tabular-nums" style={{ color: "hsl(210 42% 63%)" }}>
            {pct(masc)}%
          </div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Masculino · {masc}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <PersonF color="hsl(336 38% 66%)" fill={pct(fem)} />
          <div className="text-2xl font-bold tabular-nums" style={{ color: "hsl(336 38% 66%)" }}>
            {pct(fem)}%
          </div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Feminino · {fem}
          </div>
        </div>
      </div>

      {outro > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Não identificado: <span className="text-foreground font-medium">{outro}</span> ({pct(outro)}%)
        </div>
      )}
    </div>
  );
}
