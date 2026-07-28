import { notFound, redirect } from "next/navigation";
import { ProjectDetailView } from "@/components/project-os/project-detail-view";
import { createRepositories } from "@/lib/repositories/supabase-repositories";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${encodeURIComponent(id)}`);

  const project = await createRepositories(supabase, user.id).projects.get(id);
  if (!project) notFound();

  return <ProjectDetailView initialProject={project} />;
}
