import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignupForm } from "@/components/auth/auth-forms";

export default function SignupPage() {
  return (
    <AuthFrame
      eyebrow="Identity / Create"
      title="创建 Project OS 账户"
      description="账户确认后即可进入你的独立工作区。"
      footer={<>已有账户？ <Link href="/login" className="text-primary hover:underline">返回登录</Link></>}
    >
      <SignupForm />
    </AuthFrame>
  );
}
