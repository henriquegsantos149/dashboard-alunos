import { getCol, type SheetsData } from "@/lib/sheets";

export type Depoimento = {
  nome: string;
  email: string;
  texto: string;
  origem: string; // curso(s)
  grupo: "Aluno 10K/mês" | "Aluno Diamante";
  pergunta?: string;
};

const BAD = new Set(["true", "false", "-", "n/a", "na", "não", "nao", "sim"]);

function clean(raw: string): string {
  let t = (raw ?? "").trim();
  if (!t) return "";
  t = t.replace(/^"+|"+$/g, "").trim();
  if (t.length < 12) return "";
  if (BAD.has(t.toLowerCase())) return "";
  return t;
}

export function collectDepoimentos(data?: SheetsData): Depoimento[] {
  if (!data) return [];
  const out: Depoimento[] = [];

  const push = (
    nome: string,
    email: string,
    texto: string,
    origem: string,
    grupo: Depoimento["grupo"],
    pergunta?: string,
  ) => {
    const t = clean(texto);
    if (!t || !nome.trim()) return;
    out.push({ nome: nome.trim(), email: email.trim().toLowerCase(), texto: t, origem: origem.trim(), grupo, pergunta });
  };

  for (const r of data.alunos10k ?? []) {
    push(
      getCol(r, ["Nome"]),
      getCol(r, ["Email", "E-mail"]),
      getCol(r, ["Observação"]),
      getCol(r, ["Cursos que fez", "Curso", "Cursos"]),
      "Aluno 10K/mês",
      "Observação",
    );
  }

  for (const r of data.alunosDiamante ?? []) {
    push(
      getCol(r, ["Nome"]),
      getCol(r, ["Email", "E-mail"]),
      getCol(r, ["Observação"]),
      getCol(r, ["Cursos que fez", "Curso", "Cursos"]),
      "Aluno Diamante",
      "Observação",
    );
  }

  for (const r of data.fichaAlunos10k ?? []) {
    const nome = getCol(r, ["Qual o seu nome?", "Nome"]);
    const email = getCol(r, ["Qual o seu e-mail?", "E-mail", "Email"]);
    const origem = getCol(r, ["Você foi (é) aluno de qual (quais) dos nossos cursos?", "Cursos"]);
    push(nome, email, getCol(r, ["Pode nos contar um pouco mais sobre esse momento?"]), origem, "Aluno 10K/mês", "Sobre o momento da virada");
    push(
      nome,
      email,
      getCol(r, ["Conte-nos um pouco mais sobre como a Ambiental Pro contribuiu para o seu sucesso profissional"]),
      origem,
      "Aluno 10K/mês",
      "Contribuição da Ambiental Pro",
    );
  }

  // dedup por (email|nome) + texto
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = `${d.email || d.nome.toLowerCase()}::${d.texto.slice(0, 60).toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export type DepoimentoGrupo = {
  nome: string;
  email: string;
  origem: string;
  grupo: Depoimento["grupo"];
  itens: { texto: string; pergunta?: string }[];
};

export function groupDepoimentos(items: Depoimento[]): DepoimentoGrupo[] {
  const map = new Map<string, DepoimentoGrupo>();
  for (const d of items) {
    const k = d.email || d.nome.toLowerCase().replace(/\s+/g, " ").trim();
    let g = map.get(k);
    if (!g) {
      g = { nome: d.nome, email: d.email, origem: d.origem, grupo: d.grupo, itens: [] };
      map.set(k, g);
    }
    if (!g.origem && d.origem) g.origem = d.origem;
    if (d.grupo === "Aluno Diamante") g.grupo = d.grupo;
    if (!g.itens.some((i) => i.texto === d.texto)) g.itens.push({ texto: d.texto, pergunta: d.pergunta });
  }
  return [...map.values()].sort((a, b) => b.itens.length - a.itens.length);
}
