import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForms } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthFrame
      eyebrow="Identity / Login"
      title="欢迎回到工作区"
      description="使用邮箱密码或一次性 Magic Link 登录。"
      footer={<>还没有账户？ <Link href="/signup" className="text-primary hover:underline">创建账户</Link></>}
    >
      <LoginForms nextPath={safeNextPath(params.next)} initialError={params.error} />
    </AuthFrame>
  );
}
