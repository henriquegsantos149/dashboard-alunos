import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type StatColor = "info" | "primary" | "warning" | "pink" | "destructive";

interface Props {
  label: string;
  value: number | string;
  hint?: string;
  color: StatColor;
  loading?: boolean;
  icon?: LucideIcon;
  compact?: boolean;
  onClick?: () => void;
  info?: string;
}

const COLORS: Record<StatColor, { ring: string; text: string; glow: string; dot: string }> = {
  info:        { ring: "border-info/30",        text: "text-info",        glow: "from-info/15",        dot: "bg-info" },
  primary:     { ring: "border-primary/30",     text: "text-primary",     glow: "from-primary/15",     dot: "bg-primary" },
  warning:     { ring: "border-warning/30",     text: "text-warning",     glow: "from-warning/15",     dot: "bg-warning" },
  pink:        { ring: "border-pink/30",        text: "text-pink",        glow: "from-pink/15",        dot: "bg-pink" },
  destructive: { ring: "border-destructive/30", text: "text-destructive", glow: "from-destructive/15", dot: "bg-destructive" },
};

export function StatCard({ label, value, hint, color, loading, icon: Icon, compact, onClick, info }: Props) {
  const c = COLORS[color];
  const clickable = typeof onClick === "function";
  const Comp: any = clickable ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      type={clickable ? "button" : undefined}
      className={cn(
        "relative overflow-hidden brand-shape border bg-card/70 backdrop-blur-md p-5 text-left w-full transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] hover:border-primary/25",
        clickable && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        c.ring
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-60 pointer-events-none", c.glow)} />

      {Icon && (
        <Icon className={cn("absolute top-4 right-4 h-5 w-5 opacity-70", c.text)} aria-hidden />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn("h-2 w-2 rounded-full", c.dot)} />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground/70 hover:text-foreground transition-colors cursor-help"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] text-xs leading-relaxed">{info}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className={cn("font-bold tabular-nums text-4xl font-display", c.text)}>
          {loading
            ? "—"
            : typeof value === "number"
            ? String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
            : (() => {
                const m = String(value).match(/^(.*?)\s*(\(.*\))\s*$/);
                if (m) {
                  return (
                    <>
                      {m[1]}
                      <span className="ml-1.5 text-xs md:text-sm font-semibold opacity-80">
                        {m[2]}
                      </span>
                    </>
                  );
                }
                return value;
              })()}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
      </div>
    </Comp>
  );
}
