import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const exportTables = [
  "projects",
  "workflows",
  "workflow_nodes",
  "workflow_edges",
  "agents",
  "inbox_items",
  "prompts",
  "prompt_versions",
  "knowledge_items",
  "skills",
  "skill_events",
  "resources",
  "activity_logs",
  "migration_runs",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [profileResult, ...tableResults] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,avatar_url,locale,timezone,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    ...exportTables.map((table) =>
      supabase
        .from(table)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ),
  ]);

  const failed = [
    profileResult.error,
    ...tableResults.map((result) => result.error),
  ].find(Boolean);
  if (failed) {
    return NextResponse.json(
      { error: "EXPORT_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tables = Object.fromEntries(
    exportTables.map((table, index) => [
      table,
      tableResults[index]?.data ?? [],
    ]),
  );
  const exportedAt = new Date().toISOString();
  const date = exportedAt.slice(0, 10);

  return new NextResponse(JSON.stringify({
    format: "project-os-export",
    version: "0.2",
    exportedAt,
    account: {
      id: user.id,
      email: user.email ?? null,
      profile: profileResult.data,
    },
    tables,
  }, null, 2), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="project-os-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
