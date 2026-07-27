import { Database, KeyRound, Settings2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/project-os/page-header";

const settings = [
  { title: "本地数据", description: "项目、代理、工作流和收件箱保存在当前浏览器。", status: "ACTIVE", icon: Database },
  { title: "Supabase", description: "添加环境变量后，可在下一迭代切换为云端持久化。", status: "READY", icon: KeyRound },
  { title: "人工确认", description: "发布、删除和外部写入默认保留人工决策边界。", status: "ENFORCED", icon: ShieldCheck },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="System / Settings" title="系统边界与连接。"
        description="第一版默认使用本地模式；Supabase 数据结构和连接入口已经预留。"
        icon={Settings2} />
      <div className="grid gap-4 lg:grid-cols-3">
        {settings.map((setting) => (
          <Card key={setting.title} className="bg-card/70">
            <CardHeader><div className="mb-5 grid size-10 place-items-center rounded-lg border bg-background"><setting.icon className="size-4 text-primary" /></div><CardTitle>{setting.title}</CardTitle></CardHeader>
            <CardContent><p className="min-h-10 text-sm leading-5 text-muted-foreground">{setting.description}</p><Badge variant="outline" className="mt-5 font-mono text-[9px] text-emerald-300">{setting.status}</Badge></CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5 bg-card/70"><CardHeader><CardTitle>Supabase 环境变量</CardTitle></CardHeader><CardContent><pre className="overflow-x-auto rounded-md border bg-background p-4 font-mono text-xs leading-6 text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL=your-project-url{"\n"}NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</pre></CardContent></Card>
    </>
  );
}
