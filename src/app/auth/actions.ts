"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  emailSchema,
  loginSchema,
  safeNextPath,
  signupSchema,
  updatePasswordSchema,
  type AuthActionState,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  if (host) return `${protocol}://${host}`;

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function fields(formData: FormData, names: string[]) {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")]));
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(fields(formData, ["email", "password"]));
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: "邮箱或密码不正确，请重试。" };
  }

  redirect(safeNextPath(String(formData.get("next") ?? "/")));
}

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(
    fields(formData, ["email", "password", "confirmPassword"]),
  );
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/` },
  });

  if (error) {
    return { status: "error", message: "暂时无法创建账户，请稍后重试。" };
  }

  return {
    status: "success",
    message: "确认邮件已发送。请打开邮件完成验证后再登录。",
  };
}

export async function magicLinkAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(fields(formData, ["email"]));
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { status: "error", message: "暂时无法发送登录邮件，请稍后重试。" };
  }

  return {
    status: "success",
    message: "如果该邮箱已注册，登录链接会发送到你的邮箱。",
  };
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(fields(formData, ["email"]));
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });

  if (error) {
    return { status: "error", message: "暂时无法发送重置邮件，请稍后重试。" };
  }

  return {
    status: "success",
    message: "如果该邮箱已注册，密码重置链接会发送到你的邮箱。",
  };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse(
    fields(formData, ["password", "confirmPassword"]),
  );
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "重置链接已失效，请重新申请。" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: "密码更新失败，请重新申请重置链接。" };
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
