import { Cloud, Database, Settings2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/project-os/page-header";

const settings = [
  { title: "Supabase 身份认证", description: "邮箱密码、Magic Link、密码重置与服务端 Cookie 会话已经启用。", status: "ACTIVE", icon: Cloud },
  { title: "工作区数据", description: "当前业务数据仍保存在浏览器中，将在 S2-S4 分阶段迁移至云端。", status: "MIGRATION NEXT", icon: Database },
  { title: "人工确认", description: "发布、删除和外部写入默认保留人工决策边界。", status: "ENFORCED", icon: ShieldCheck },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="System / Settings"
        title="系统边界与连接"
        description="身份认证已经切换到 Supabase SSR；业务数据将按迁移计划逐步进入云端。"
        icon={Settings2}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {settings.map((setting) => (
          <Card key={setting.title} className="bg-card/70">
            <CardHeader>
              <div className="mb-5 grid size-10 place-items-center rounded-lg border bg-background">
                <setting.icon className="size-4 text-primary" />
              </div>
              <CardTitle>{setting.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="min-h-10 text-sm leading-5 text-muted-foreground">{setting.description}</p>
              <Badge variant="outline" className="mt-5 font-mono text-[9px] text-emerald-300">{setting.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5 bg-card/70">
        <CardHeader><CardTitle>Supabase 公共环境变量</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md border bg-background p-4 font-mono text-xs leading-6 text-muted-foreground">
            NEXT_PUBLIC_SUPABASE_URL=your-project-url{"\n"}
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
          </pre>
        </CardContent>
      </Card>
    </>
  );
}
