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
        "relative overflow-hidden brand-shape border bg-card/70 backdrop-blur-md p-3.5 sm:p-4 text-left w-full transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] hover:border-primary/25 flex flex-col justify-between min-w-0",
        clickable && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        c.ring
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-60 pointer-events-none", c.glow)} />

      {/* Header: Label and Icon in flex to guarantee zero overlapping */}
      <div className="relative flex items-start justify-between gap-1.5 mb-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.dot)} />
          <p
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight truncate"
            title={label}
          >
            {label}
          </p>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground/70 hover:text-foreground transition-colors cursor-help shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] text-xs leading-relaxed">{info}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {Icon && (
          <Icon className={cn("h-4 w-4 shrink-0 opacity-70 ml-1 mt-0.5", c.text)} aria-hidden />
        )}
      </div>

      <div className="relative min-w-0">
        <p className={cn("font-bold tabular-nums text-2xl sm:text-3xl 2xl:text-4xl font-display leading-tight truncate", c.text)}>
          {loading
            ? "—"
            : typeof value === "number"
            ? String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
            : (() => {
                const m = String(value).match(/^(.*?)\s*(\(.*\))\s*$/);
                if (m) {
                  return (
                    <span className="inline-flex items-baseline flex-wrap gap-x-1">
                      <span>{m[1]}</span>
                      <span className="text-xs sm:text-sm font-sans font-medium opacity-75">
                        {m[2]}
                      </span>
                    </span>
                  );
                }
                return value;
              })()}
        </p>
        {hint && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate" title={hint}>
            {hint}
          </p>
        )}
      </div>
    </Comp>
  );
}
