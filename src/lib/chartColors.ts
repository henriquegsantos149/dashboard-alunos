// Paleta multicolorida harmônica do dashboard (dark mode executivo).
// Tons modernos, saturação equilibrada — legíveis sobre fundo grafite.

export const PALETTE = [
  "hsl(150 38% 58%)", // verde esmeralda (principal / sucesso)
  "hsl(202 45% 62%)", // azul cyan
  "hsl(263 34% 68%)", // roxo / violeta
  "hsl(38 48% 62%)",  // âmbar
  "hsl(342 38% 66%)", // rosa
  "hsl(176 30% 55%)", // teal
  "hsl(22 45% 62%)",  // laranja
  "hsl(224 38% 68%)", // azul índigo
  "hsl(292 28% 66%)", // magenta suave
  "hsl(92 28% 58%)",  // verde-lima
  "hsl(2 40% 63%)",   // vermelho
  "hsl(230 8% 52%)",  // grafite (outros / N/I)
];

// Barras: cor base translúcida e destaque (usados em componentes de barra única)
export const BAR_BASE = "hsl(202 35% 55% / 0.7)";
export const BAR_HIGHLIGHT = "hsl(150 38% 58%)";
export const NEUTRAL_MUTED = "hsl(230 8% 52%)";

// Status de matrícula — cores semânticas fixas
export const STATUS_COLORS: Record<string, string> = {
  "Ativa": "hsl(150 38% 58%)",
  "Ativo": "hsl(150 38% 58%)",
  "Concluída": "hsl(202 45% 62%)",
  "Concluido": "hsl(202 45% 62%)",
  "Formando": "hsl(263 34% 68%)",
  "Pré-confirmada": "hsl(38 48% 62%)",
  "Atrasado": "hsl(22 45% 62%)",
  "Cancelada": "hsl(22 45% 62%)",
  "Indeferida": "hsl(230 8% 52%)",
  "Não concluída": "hsl(2 40% 63%)",
  "Evasão": "hsl(2 40% 63%)",
  "Não informado": "hsl(230 8% 45%)",
};

// Cores fixas por curso/formação. Usadas em TODAS as páginas.
export const CURSO_COLORS: Record<string, string> = {
  "Pós-GGSR": "hsl(202 45% 62%)",
  "Pós GGSR": "hsl(202 45% 62%)",
  "MBA": "hsl(263 34% 68%)",
  "Pós-IA.MA": "hsl(176 34% 60%)",
  "Pós IA.MA": "hsl(176 34% 60%)",
  "MBA IDA": "hsl(263 34% 68%)",
  "Pós-ALPA": "hsl(150 38% 58%)",
  "Pós ALPA": "hsl(150 38% 58%)",
  "Pós-GRAC": "hsl(38 48% 62%)",
  "Pós GRAC": "hsl(38 48% 62%)",
  "PAP": "hsl(176 30% 55%)",
  "F2W": "hsl(342 38% 66%)",
  "GeoDev": "hsl(224 38% 68%)",
  "Python GeoDev": "hsl(224 38% 68%)",
  "Workshop": "hsl(22 45% 62%)",
};

export function cursoColor(name: string): string {
  return CURSO_COLORS[name] ?? "hsl(230 8% 52%)";
}

// Escala ordinal (qualidade / engajamento — do melhor ao pior)
export const SCALE_QUALITY = [
  "hsl(150 38% 58%)", // ótimo / ativo
  "hsl(176 30% 55%)", // bom
  "hsl(38 48% 62%)",  // regular
  "hsl(22 45% 62%)",  // ruim
  "hsl(2 40% 63%)",   // péssimo / inativo
];

// Cores fixas para categorias de atuação profissional (consistência cross-page)
export const ATUACAO_COLORS: Record<string, string> = {
  "Autônomo / Consultor (PJ)": "hsl(150 38% 58%)",
  "Estagiário": "hsl(202 45% 62%)",
  "Trainee": "hsl(176 30% 55%)",
  "Profissional Contratado (Nível Júnior ou Pleno)": "hsl(263 34% 68%)",
  "Profissional Contratado (Nível Sênior ou Especialista)": "hsl(224 38% 68%)",
  "Servidor Público": "hsl(38 48% 62%)",
  "Estudante": "hsl(342 38% 66%)",
  "Outro": "hsl(230 8% 52%)",
  "Não informado": "hsl(230 8% 45%)",
};

// Cores para tipo de instituição
export const TIPO_INST_COLORS: Record<string, string> = {
  "Pública (Federal/Estadual)": "hsl(202 45% 62%)",
  "Pública (Municipal)": "hsl(176 30% 55%)",
  "Privada": "hsl(150 38% 58%)",
  "Academia/Pesquisa": "hsl(263 34% 68%)",
  "Autônomo/Sem vínculo": "hsl(38 48% 62%)",
};

// Resolve a cor de uma categoria: mapas fixos primeiro, senão paleta por índice.
export function colorFor(name: string, index = 0): string {
  const key = String(name ?? "").trim();
  const lower = key.toLowerCase();
  if (lower === "outro" || lower === "outros" || lower === "não informado" || lower === "n/i")
    return NEUTRAL_MUTED;
  return (
    STATUS_COLORS[key] ??
    CURSO_COLORS[key] ??
    ATUACAO_COLORS[key] ??
    TIPO_INST_COLORS[key] ??
    PALETTE[index % PALETTE.length]
  );
}

// Degradê pastel de verde (do mais vivo ao mais apagado) — usado em rankings ordinais
export const GREEN_RAMP = [
  "hsl(150 38% 60%)",
  "hsl(155 30% 55%)",
  "hsl(160 24% 50%)",
  "hsl(165 18% 45%)",
  "hsl(170 12% 41%)",
  "hsl(180 8% 38%)",
];

export function greenRamp(i: number): string {
  return GREEN_RAMP[Math.min(i, GREEN_RAMP.length - 1)];
}
