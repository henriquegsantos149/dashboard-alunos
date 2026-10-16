import logo from "@/assets/logo.png";
import logoIcon from "@/assets/logo-icon.png";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Gem, LineChart, Menu, Rocket, Wallet, Target, UserSearch, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSheetsData } from "@/lib/sheets";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Visão Geral - Pós Graduação", icon: LayoutDashboard, end: true },
  { to: "/extensao", label: "Cursos de Extensão & Livres", icon: BookOpen },
  { to: "/diamante", label: "Alunos 10K & Diamante", icon: Gem },
  { to: "/alta-renda", label: "Alunos Alta Renda", icon: Wallet },
  { to: "/insights", label: "Insights Avançados", icon: LineChart },
  { to: "/comercial", label: "Inteligência Comercial", icon: Target },
  { to: "/central-aluno", label: "Central do Aluno", icon: UserSearch },
];


export default function DashboardLayout() {
  const { data, isFetching } = useSheetsData();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "1";
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {!collapsed ? (
          <div className="px-4 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={logoIcon} alt="Ambiental Pro" className="h-9 w-9 object-contain shrink-0" />
              <span className="text-lg font-bold tracking-tight leading-none whitespace-nowrap">
                <span className="text-foreground">Dash Alunos</span>
                <span className="text-[#6FB03A]">Pro</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="h-8 w-8 shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-2 h-16 justify-center">
            <img src={logoIcon} alt="Ambiental Pro" className="h-9 w-9 object-contain" />
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Expandir menu"
              title="Expandir menu"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className={cn("h-px bg-sidebar-border/60", collapsed ? "mx-2" : "mx-4")} />

        <nav className={cn("flex-1", collapsed ? "px-2 pt-4 space-y-2" : "px-3 pt-5 space-y-1.5")}>
          {!collapsed && (
            <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Navegação
            </p>
          )}
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg text-[13px] font-medium transition-colors",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <item.icon className="h-[16px] w-[16px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
            {data ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Sincronizado
                </div>
                <div className="opacity-70">
                  {new Date(data.fetchedAt).toLocaleString("pt-BR")}
                </div>
              </div>
            ) : (
              <span>Carregando dados…</span>
            )}
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 xl:px-8 h-16">
            <div className="flex items-center gap-2.5 lg:hidden">
              <img src={logo} alt="Ambiental Pro" className="h-8 w-auto rounded shrink-0" />
              <span className="text-sm font-bold tracking-tight leading-none whitespace-nowrap">
                <span className="text-foreground">Dash Alunos</span>
                <span className="text-[#6FB03A]">Pro</span>
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                {pathname === "/" ? "Visão Geral - Pós Graduação" : pathname === "/diamante" ? "10K & Diamante" : pathname === "/alta-renda" ? "Alta Renda" : pathname === "/comercial" ? "Inteligência Comercial" : pathname === "/central-aluno" ? "Central do Aluno" : pathname === "/extensao" ? "Extensão & Livres" : "Insights"}
              </Badge>
              {isFetching && (
                <span className="text-xs text-muted-foreground">atualizando…</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-pink/20 border border-primary/30 text-primary shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]"
                title="Decolando insights"
              >
                <Rocket className="h-4 w-4 -rotate-45" />
              </span>
            </div>
          </div>
          {/* Mobile nav */}
          <div className="lg:hidden flex gap-1 px-3 pb-2 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground"
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 xl:px-8 py-6 sm:py-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
        <footer className="border-t border-border/60 bg-background/40 mt-4">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-8 py-6 flex justify-center">
            <span className="text-[11px] sm:text-xs font-medium tracking-[0.28em] uppercase text-muted-foreground/80">
              Ambiental Pro &mdash; Conhecimento que transforma
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
