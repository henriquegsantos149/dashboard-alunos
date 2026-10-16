import { Banknote, Coins, DollarSign, Wallet, TrendingUp, HelpCircle } from "lucide-react";

type Item = { name: string; value: number };

const META: Record<string, { icon: any; color: string; short: string }> = {
  "Até R$ 2.000": { icon: Coins, color: "hsl(38 48% 62%)", short: "Até 2k" },
  "De R$ 2.000 a R$ 4.000": { icon: Wallet, color: "hsl(176 30% 55%)", short: "2k–4k" },
  "De R$ 4.000 a R$ 7.000": { icon: Banknote, color: "hsl(202 45% 62%)", short: "4k–7k" },
  "De R$ 7.000 a R$ 10.000": { icon: DollarSign, color: "hsl(150 38% 58%)", short: "7k–10k" },
  "Acima de R$ 10.000": { icon: TrendingUp, color: "hsl(263 34% 68%)", short: "10k+" },
  "Prefiro não responder": { icon: HelpCircle, color: "hsl(230 8% 52%)", short: "N/I" },
};

export function RendaViz({ data }: { data: Item[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="h-full flex flex-col justify-between overflow-auto pr-1 py-1 gap-2.5">
      {data.map((d) => {
        const meta = META[d.name] ?? { icon: Coins, color: "hsl(var(--primary))", short: d.name };
        const Icon = meta.icon;
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        const widthPct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={d.name} className="group">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-6 w-6 rounded-md grid place-items-center shrink-0"
                  style={{ background: `${meta.color.replace("hsl(", "hsla(").replace(")", " / 0.18)")}`, color: meta.color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-foreground font-medium">{d.name}</span>
              </div>
              <div className="tabular-nums text-muted-foreground shrink-0">
                <span className="text-foreground font-semibold">{d.value}</span>{" "}
                <span className="opacity-70">({pct.toFixed(0)}%)</span>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${meta.color}, ${meta.color.replace("hsl(", "hsla(").replace(")", " / 0.6)")})`,
                  boxShadow: `0 0 12px ${meta.color.replace("hsl(", "hsla(").replace(")", " / 0.4)")}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
