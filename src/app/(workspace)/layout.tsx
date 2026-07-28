import { redirect } from "next/navigation";
import { AppShell } from "@/components/project-os/app-shell";
import { ProjectOSProvider } from "@/components/project-os/project-os-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CloudState } from "@/lib/repositories/contracts";
import { loadCloudState } from "@/lib/repositories/supabase-repositories";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let initialCloudState: CloudState = { projects: [], inbox: [], agents: [] };
  let initialCloudError: string | undefined;
  try {
    initialCloudState = await loadCloudState(supabase, user.id);
  } catch {
    initialCloudError = "云端数据暂时不可用，请确认 v0.2 数据库迁移已经执行。";
  }

  return (
    <TooltipProvider>
      <ProjectOSProvider
        initialCloudState={initialCloudState}
        initialCloudError={initialCloudError}
      >
        <AppShell userEmail={user.email ?? "已登录用户"}>{children}</AppShell>
      </ProjectOSProvider>
    </TooltipProvider>
  );
}
