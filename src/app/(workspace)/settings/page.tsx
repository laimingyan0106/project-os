import { redirect } from "next/navigation";
import { SettingsView } from "@/components/project-os/settings-view";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsView
      userEmail={user.email ?? "已登录用户"}
      initialDisplayName={String(profile?.display_name ?? "")}
      initialAvatarUrl={profile?.avatar_url ? String(profile.avatar_url) : undefined}
    />
  );
}
