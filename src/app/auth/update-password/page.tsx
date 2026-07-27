import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=重置链接已失效，请重新申请。");

  return (
    <AuthFrame
      eyebrow="Identity / New password"
      title="设置新的密码"
      description="新密码至少 8 位，并同时包含字母和数字。"
    >
      <UpdatePasswordForm />
    </AuthFrame>
  );
}
