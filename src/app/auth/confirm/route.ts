import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const supportedOtpTypes = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && supportedOtpTypes.has(value));
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const isRecovery = type === "recovery";
  const nextPath = safeNextPath(
    request.nextUrl.searchParams.get("next"),
    isRecovery ? "/auth/update-password" : "/",
  );

  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  const errorUrl = new URL(isRecovery ? "/forgot-password" : "/login", request.url);
  errorUrl.searchParams.set(
    "error",
    isRecovery
      ? "密码重置链接无效、已过期或已经使用，请重新申请。"
      : "登录链接无效、已过期或已经使用，请重新申请。",
  );
  return NextResponse.redirect(errorUrl);
}
