import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,oklch(0.82_0.16_92/0.13),transparent_32rem)]" />
      <section className="relative hidden border-r border-white/8 p-12 lg:flex lg:flex-col">
        <Link href="/login" className="flex w-fit items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_36px_-10px_var(--primary)]">
            <Zap className="size-5 fill-current" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">PROJECT OS</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Creator command center
            </span>
          </span>
        </Link>

        <div className="my-auto max-w-xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-3" /> v0.2 cloud workspace
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
            把项目、工作流和 AI Agent 放进同一套运行系统。
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            登录后，你的工作区会获得独立会话与云端身份边界。每一次数据迁移都可追踪、可恢复。
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-400" /> Supabase Auth</span>
          <span className="flex items-center gap-2"><ArrowUpRight className="size-4 text-primary" /> Vercel Preview</span>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4 fill-current" />
            </span>
            <span className="text-sm font-semibold">PROJECT OS</span>
          </div>
          <div className="rounded-2xl border bg-card/82 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            <div className="mt-7">{children}</div>
          </div>
          {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
