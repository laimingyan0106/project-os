import { AuthCallback } from "@/components/auth/auth-callback";
import { AuthFrame } from "@/components/auth/auth-frame";
import { safeNextPath } from "@/lib/auth";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthFrame
      eyebrow="Identity / Callback"
      title="正在验证安全链接"
      description="请稍候，我们正在建立安全会话并确认跳转目标。"
    >
      <AuthCallback nextPath={safeNextPath(params.next)} />
    </AuthFrame>
  );
}
