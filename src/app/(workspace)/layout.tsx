import { redirect } from "next/navigation";
import { AppShell } from "@/components/project-os/app-shell";
import { ProjectOSProvider } from "@/components/project-os/project-os-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
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

  return (
    <TooltipProvider>
      <ProjectOSProvider>
        <AppShell userEmail={user.email ?? "已登录用户"}>{children}</AppShell>
      </ProjectOSProvider>
    </TooltipProvider>
  );
}
