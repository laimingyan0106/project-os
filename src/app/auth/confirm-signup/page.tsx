import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { confirmSignupAction } from "@/app/auth/actions";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/auth";

export default async function ConfirmSignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? "";
  const canConfirm = Boolean(tokenHash && params.type === "email");

  return (
    <AuthFrame
      eyebrow="Identity / Confirm"
      title="确认你的邮箱"
      description="点击下方按钮后才会使用一次性确认凭证。仅打开此页面不会完成验证。"
      footer={(
        <>
          已经确认过？{" "}
          <Link href="/login" className="text-primary hover:underline">
            直接登录
          </Link>
        </>
      )}
    >
      {canConfirm ? (
        <form action={confirmSignupAction} className="space-y-4">
          <input type="hidden" name="tokenHash" value={tokenHash} />
          <input type="hidden" name="next" value={safeNextPath(params.next)} />
          <div
            role="status"
            className="rounded-lg border bg-background/50 px-3 py-3 text-sm leading-6 text-muted-foreground"
          >
            邮箱确认尚未执行。请确认这是你刚刚申请的 Project OS 账户。
          </div>
          <Button type="submit" size="lg" className="h-10 w-full">
            <ShieldCheck />
            确认邮箱并进入工作区
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-lg border border-amber-400/20 bg-amber-400/8 px-3 py-3 text-sm leading-6 text-amber-100"
          >
            确认链接不完整，或已被邮件服务处理。如果账户已经确认，请直接登录。
          </div>
          <Button asChild variant="outline" size="lg" className="h-10 w-full">
            <Link href="/login">返回登录</Link>
          </Button>
        </div>
      )}
    </AuthFrame>
  );
}
