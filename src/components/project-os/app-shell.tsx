"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot, Boxes, ChevronRight, CircleDot, Command as CommandIcon, FolderKanban,
  Inbox, LayoutDashboard, LogOut, Menu, Search, Settings2, Workflow, Zap,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, key: "G D" },
  { href: "/inbox", label: "Inbox", icon: Inbox, key: "G I" },
  { href: "/projects", label: "Projects", icon: FolderKanban, key: "G P" },
  { href: "/workflows", label: "Workflow", icon: Workflow, key: "G W" },
  { href: "/agents", label: "Agent Center", icon: Bot, key: "G A" },
];

const futureNav = ["Prompt Library", "Knowledge Base", "Skill Tree", "Resources"];

function Navigation({ onNavigate, userEmail }: { onNavigate?: () => void; userEmail: string }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_28px_-6px_var(--primary)]">
          <Zap className="size-4 fill-current" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">PROJECT OS</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Command center</div>
        </div>
      </div>
      <nav className="flex-1 space-y-6 px-3 py-5">
        <div className="space-y-1">
          <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">Core / 01</p>
          {primaryNav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}
                className={cn("group flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]")}>
                <item.icon className={cn("size-4", active && "text-primary")} />
                <span className="flex-1">{item.label}</span>
                <span className="font-mono text-[9px] text-muted-foreground/40">{item.key}</span>
              </Link>
            );
          })}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">Expansion / 02</p>
          {futureNav.map((label) => (
            <div key={label} className="flex h-9 items-center gap-3 px-3 text-xs text-muted-foreground/45">
              <Boxes className="size-3.5" /><span className="flex-1">{label}</span>
              <span className="rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase">soon</span>
            </div>
          ))}
        </div>
      </nav>
      <div className="border-t p-3">
        <Link href="/settings" onClick={onNavigate} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          <Settings2 className="size-4" /> Settings
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-md border bg-background/40 p-3">
          <div className="relative">
            <div className="size-2 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 size-2 animate-ping rounded-full bg-emerald-400 opacity-50" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Cloud session</p>
            <p className="truncate font-mono text-[9px] text-muted-foreground">{userEmail}</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="退出登录">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const navigate = (href: string) => { setSearchOpen(false); router.push(href); };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 hidden w-[248px] border-r bg-sidebar/88 backdrop-blur-xl lg:block"><Navigation userEmail={userEmail} /></aside>
      <div className="lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/78 px-4 backdrop-blur-xl md:px-7">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon-sm" className="lg:hidden"><Menu /></Button></SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0"><SheetTitle className="sr-only">导航</SheetTitle><Navigation userEmail={userEmail} onNavigate={() => setMobileOpen(false)} /></SheetContent>
          </Sheet>
          <button onClick={() => setSearchOpen(true)} className="flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border bg-card/60 px-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
            <Search className="size-3.5" /><span className="truncate">搜索项目、代理、收件箱…</span>
            <span className="ms-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[9px] sm:inline">⌘ K</span>
          </button>
          <div className="ms-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><CircleDot className="size-3 text-emerald-400" /> System ready</div>
            <div className="grid size-8 place-items-center rounded-full border bg-card font-mono text-[10px]">OS</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1520px] p-4 md:p-7 lg:p-8">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="输入模块名称或操作…" />
        <CommandList>
          <CommandEmpty>没有找到结果。</CommandEmpty>
          <CommandGroup heading="前往">
            {primaryNav.map((item) => (
              <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                <item.icon className="size-4" />{item.label}<ChevronRight className="ms-auto size-3" />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="快捷操作">
            <CommandItem onSelect={() => navigate("/projects")}><CommandIcon className="size-4" />管理项目</CommandItem>
            <CommandItem onSelect={() => navigate("/inbox")}><Inbox className="size-4" />打开收件箱</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
