"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

export function AuthCallback({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function completeAuthentication() {
      const supabase = createClient();
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = search.get("code");
      const tokenHash = search.get("token_hash");
      const otpType = search.get("type");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const recoveryFlow = (hash.get("type") ?? otpType) === "recovery";

      let authError: Error | null = null;

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        authError = exchangeError;
      } else if (tokenHash && otpType && emailOtpTypes.has(otpType as EmailOtpType)) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType,
        });
        authError = verifyError;
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        authError = sessionError;
      } else {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        authError = sessionError ?? (session ? null : new Error("Missing authentication session"));
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      if (!active) return;
      if (authError) {
        setError("登录链接无效、已过期或已经使用，请重新申请。");
        return;
      }

      router.replace(recoveryFlow ? "/auth/update-password" : nextPath);
      router.refresh();
    }

    void completeAuthentication();
    return () => {
      active = false;
    };
  }, [nextPath, router]);

  if (error) {
    return (
      <div className="space-y-4">
        <div role="alert" className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/8 p-3 text-sm leading-5 text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
        <Button asChild variant="outline" size="lg" className="h-10 w-full">
          <Link href="/forgot-password">重新申请密码重置</Link>
        </Button>
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border bg-background/50 p-4 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin text-primary" />
      正在交换安全会话，请不要关闭此页面…
    </div>
  );
}
