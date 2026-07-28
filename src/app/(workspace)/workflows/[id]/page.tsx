import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { WorkflowView } from "@/components/project-os/workflow-view";
import { createRepositories } from "@/lib/repositories/supabase-repositories";
import { createClient } from "@/lib/supabase/server";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/workflows/${encodeURIComponent(id)}`);

  const workflow = await createRepositories(
    supabase,
    user.id,
  ).workflows.getGraph(id);
  if (!workflow) notFound();

  return <WorkflowView key={`${workflow.id}:${workflow.version}`} initialWorkflow={workflow} />;
}
