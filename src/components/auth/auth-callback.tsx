"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/supabase/config";

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
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const tokenHash = search.get("token_hash");
      const otpType = search.get("type");
      const implicitFlow = hash.has("access_token") && hash.has("refresh_token");
      const callbackErrorCode = search.get("error_code") ?? hash.get("error_code");
      const { url, publishableKey } = getSupabaseConfig();
      const supabase = createBrowserClient(url, publishableKey, {
        isSingleton: false,
        auth: {
          flowType: implicitFlow ? "implicit" : "pkce",
          detectSessionInUrl: true,
        },
      });

      let authError: Error | null = null;

      if (callbackErrorCode) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        authError = session ? null : (sessionError ?? new Error(callbackErrorCode));
      } else if (tokenHash && otpType && emailOtpTypes.has(otpType as EmailOtpType)) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType,
        });
        authError = verifyError;
      } else {
        // The callback-only client owns exactly one URL exchange. getSession()
        // waits for initialization to finish before returning the persisted session.
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

      router.replace(nextPath);
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
          <Link href="/login">如果已完成确认，直接登录</Link>
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
