import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthFrame
      eyebrow="Identity / Recovery"
      title="重置账户密码"
      description="输入注册邮箱，我们会发送安全的密码重置链接。"
      footer={<Link href="/login" className="text-primary hover:underline">返回登录</Link>}
    >
      <ForgotPasswordForm initialError={params.error} />
    </AuthFrame>
  );
}
