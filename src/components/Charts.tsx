import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  height?: number;
  action?: React.ReactNode;
}

export function ChartCard({ title, description, children, height = 288, action }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 shadow-[var(--shadow-card)] min-w-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate" title={title}>{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5 truncate" title={description}>{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div style={{ height }} className="min-w-0">{children}</div>
    </div>
  );
}

import { PALETTE, colorFor } from "@/lib/chartColors";

function CustomTooltip({ active, payload, labelPrefix = "Categoria" }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const name = p?.payload?.name ?? p?.name;
  const value = p?.value ?? p?.payload?.value;
  if (!name) return null;
  return (
    <div className="rounded-lg border border-white/5 bg-popover/95 backdrop-blur-md px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground">{labelPrefix}: {name}</div>
      <div className="text-muted-foreground mt-0.5">Alunos: <span className="text-foreground font-semibold">{value}</span></div>
    </div>
  );
}

function WrappedTick({ x, y, payload, width = 160 }: any) {
  const text: string = String(payload?.value ?? "");
  const charPx = 5.6;
  const maxChars = Math.max(10, Math.floor(width / charPx));

  let lines: string[] = [text];
  if (text.length > maxChars) {
    let breakIdx = -1;
    const parenIdx = text.indexOf("(");
    if (parenIdx > 0 && parenIdx <= maxChars + 4) {
      breakIdx = parenIdx - 1;
    } else {
      const slice = text.slice(0, maxChars + 1);
      breakIdx = slice.lastIndexOf(" ");
      if (breakIdx < 0) breakIdx = maxChars;
    }
    lines = [text.slice(0, breakIdx).trim(), text.slice(breakIdx).trim()];
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((ln, i) => (
        <text
          key={i}
          x={-6}
          y={i * 12 - (lines.length - 1) * 6}
          dy={4}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          fontSize={10.5}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

export function HBarChart({
  data,
  dataKey = "value",
  labelKey = "name",
  tooltipLabel = "Categoria",
}: {
  data: any[];
  dataKey?: string;
  labelKey?: string;
  tooltipLabel?: string;
}) {
  if (!data || data.length === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  const maxLabelLen = Math.max(...data.map((d: any) => String(d[labelKey] ?? "").length), 8);
  const yAxisWidth = Math.min(160, Math.max(65, maxLabelLen * 5.4 + 10));
  const maxValue = Math.max(...data.map((d: any) => Number(d[dataKey]) || 0));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
        barCategoryGap="30%"
      >
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10.5} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          stroke="hsl(var(--muted-foreground))"
          fontSize={10.5}
          width={yAxisWidth}
          interval={0}
          tickMargin={2}
          tick={<WrappedTick width={yAxisWidth - 6} />}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
          content={<CustomTooltip labelPrefix={tooltipLabel} />}
        />
        <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} fillOpacity={0.8} isAnimationActive>
          {data.map((d: any, i: number) => (
            <Cell
              key={i}
              fill={colorFor(String(d[labelKey] ?? ""), i)}
              fillOpacity={0.8}
              stroke="hsl(0 0% 100% / 0.04)"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={<CustomTooltip labelPrefix="Curso" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={42}
          outerRadius={72}
          paddingAngle={3}
          stroke="hsl(var(--background))"
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={colorFor(d.name, i)} fillOpacity={0.85} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function parseLightness(hsl: string): number {
  const m = hsl.match(/hsl\(\s*\d+\s+\d+%\s+(\d+)%/);
  return m ? Number(m[1]) : 50;
}

const TreemapContent = (props: any) => {
  const { x, y, width, height, index, name, value } = props;
  if (!name || !value || width <= 0 || height <= 0) return null;
  const fill = colorFor(String(name), index ?? 0);

  const textColor = parseLightness(fill) >= 58 ? "hsl(0 0% 14%)" : "hsl(0 0% 96% / 0.92)";
  const charPx = 5.9;
  const maxChars = Math.floor((width - 14) / charPx);
  const showName = width > 46 && height > 20 && maxChars >= 4;
  const label = name.length > maxChars ? `${name.slice(0, Math.max(3, maxChars - 1)).trimEnd()}…` : name;

  return (
    <g style={{ cursor: "pointer" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.82}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        rx={4}
      />
      {showName && (
        <text
          x={x + 8}
          y={y + Math.min(18, height / 2 + 4)}
          fill={textColor}
          style={{ fontWeight: 500, fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}
          fontSize={10.5}
        >
          {label}
        </text>
      )}
    </g>
  );
};


function TreemapTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p?.name) return null;
  const total = p?.root?.value ?? p?.rootValue ?? 0;
  const value = p?.value ?? 0;
  const pct = total ? ((value / total) * 100).toFixed(1) : null;
  return (
    <div className="rounded-lg border border-white/5 bg-popover/95 backdrop-blur-md px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground">{p.name}</div>
      <div className="text-muted-foreground mt-0.5">
        {value} {value === 1 ? "aluno" : "alunos"}{pct ? ` (${pct}%)` : ""}
      </div>
    </div>
  );
}

export function TreemapChart({ data }: { data: { name: string; value: number }[] }) {
  const clean = (data || []).filter((d) => d && d.name && d.name.trim() !== "" && Number(d.value) > 0);
  if (clean.length === 0) {
    return <div className="h-full grid place-items-center text-xs text-muted-foreground">Sem dados</div>;
  }
  const total = clean.reduce((s, d) => s + d.value, 0);
  const withRoot = clean.map((d) => ({ ...d, rootValue: total }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={withRoot}
        dataKey="value"
        nameKey="name"
        aspectRatio={4 / 3}
        stroke="hsl(var(--background))"
        content={<TreemapContent />}
        isAnimationActive
      >
        <Tooltip content={<TreemapTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
}


export function ChartLegend({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="space-y-1.5 text-xs w-full min-w-0">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center justify-between gap-2 min-w-0" title={`${d.name}: ${d.value} (${((d.value / total) * 100).toFixed(0)}%)`}>
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: colorFor(d.name, i) }}
            />
            <span className="truncate text-foreground/90">{d.name}</span>
          </span>
          <span className="tabular-nums text-muted-foreground shrink-0 text-right whitespace-nowrap pl-1">
            <span className="font-medium text-foreground">{d.value}</span>{" "}
            <span className="opacity-70 text-[11px]">({((d.value / total) * 100).toFixed(0)}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
