import { ProjectsView } from "@/components/project-os/projects-view";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  return <ProjectsView openCreate={params.new === "1"} />;
}
