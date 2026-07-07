import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "./app-provider";
import { useListRoles } from "@workspace/api-client-react";
import { 
  MessageSquare, Sparkles, LineChart, Calendar, BookOpen, 
  Database, Settings, ShieldCheck, ChevronDown, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoWhite from "@/assets/telefonica-logo-white.png";
import logoBlue from "@/assets/telefonica-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { name: "Ask", path: "/", icon: MessageSquare },
      { name: "Generate", path: "/generate", icon: Sparkles },
      { name: "KPIs", path: "/kpis", icon: LineChart },
      { name: "Planning", path: "/planning", icon: Calendar },
    ]
  },
  {
    label: "Knowledge",
    items: [
      { name: "Wiki", path: "/wiki", icon: BookOpen },
    ]
  },
  {
    label: "Backend",
    items: [
      { name: "Data", path: "/data", icon: Database },
      { name: "Admin", path: "/admin", icon: Settings },
      { name: "Brand", path: "/brand", icon: ShieldCheck },
    ]
  }
];

function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-tf-navy text-white flex flex-col h-full flex-shrink-0">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <div className="text-xs uppercase tracking-eyebrow text-tf-navy-tint mb-3 px-3 font-bold">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path} className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-pill text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-tf-blue text-white shadow-sm" 
                      : "text-tf-grey-200 hover:bg-tf-navy-tint hover:text-white"
                  )}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Topbar() {
  const { area, setArea, roleId, setRoleId } = useApp();
  const { data: roles } = useListRoles();

  useEffect(() => {
    if (roles && roles.length > 0 && !roleId) {
      setRoleId(roles[0].id);
    }
  }, [roles, roleId, setRoleId]);

  const activeRole = roles?.find(r => r.id === roleId) || roles?.[0];

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 flex-shrink-0 space-x-4 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <img src={logoBlue} alt="Telefónica" className="h-6" />
        <span className="font-bold tracking-tight text-lg text-tf-navy border-l pl-3 border-border">Hub SSoT</span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-eyebrow text-muted-foreground font-bold">Area</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-pill h-8 px-4 font-semibold border-border bg-muted/50 hover:bg-muted">
                {area} <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-40">
              {["Comunicación", "Marca", "Gabinete"].map((a) => (
                <DropdownMenuItem key={a} onClick={() => setArea(a as any)} className="rounded-lg font-medium cursor-pointer">
                  <span className="flex-1">{a}</span>
                  {area === a && <Check className="w-4 h-4 text-tf-blue" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-eyebrow text-muted-foreground font-bold">Persona</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-pill h-8 px-4 font-semibold border-border bg-muted/50 hover:bg-muted">
                {activeRole?.label || "Select Role"} <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-64 p-2">
              {roles?.map((r) => (
                <DropdownMenuItem key={r.id} onClick={() => setRoleId(r.id)} className="rounded-lg flex flex-col items-start p-3 cursor-pointer mb-1 last:mb-0">
                  <div className="flex items-center w-full">
                    <span className="flex-1 font-bold text-tf-navy">{r.label}</span>
                    {roleId === r.id && <Check className="w-4 h-4 text-tf-blue" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between w-full">
                    <span className="truncate mr-2" title={r.description}>{r.description}</span>
                    <span className="uppercase tracking-eyebrow text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-muted whitespace-nowrap">{r.clearance}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
