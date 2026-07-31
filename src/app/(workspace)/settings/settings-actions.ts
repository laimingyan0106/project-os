"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface ProfileSettings {
  displayName: string;
  avatarUrl?: string;
}

export interface DeletedDataSummary {
  projects: number;
  workflows: number;
  agents: number;
  inbox: number;
  prompts: number;
  knowledge: number;
  skills: number;
  resources: number;
  completed_at: string;
}

const profileSchema = z.object({
  displayName: z.string().trim().max(120),
  avatarUrl: z.union([
    z.string().url().max(2_000).refine(
      (value) => value.startsWith("https://"),
      "Avatar URL must use HTTPS.",
    ),
    z.literal(""),
    z.undefined(),
  ]),
});

const deleteDataSchema = z.object({
  confirmation: z.literal("DELETE DATA"),
});

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
  password: z.string().min(8).max(128),
});

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfileSettingsAction(
  input: ProfileSettings,
): Promise<ActionResult<ProfileSettings>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请检查显示名和头像 URL。");
  }

  const { supabase, user } = await currentUser();
  if (!user) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", user.id)
    .select("display_name,avatar_url")
    .single();

  if (error) {
    return actionError("UNKNOWN_ERROR", "账户资料保存失败，请稍后重试。");
  }
  return {
    ok: true,
    data: {
      displayName: String(data.display_name ?? ""),
      avatarUrl: data.avatar_url ? String(data.avatar_url) : undefined,
    },
  };
}

export async function deleteAllWorkspaceDataAction(
  input: { confirmation: string },
): Promise<ActionResult<DeletedDataSummary>> {
  const parsed = deleteDataSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "请输入 DELETE DATA 进行确认。");
  }

  const { supabase, user } = await currentUser();
  if (!user) return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");

  const { data, error } = await supabase.rpc("delete_all_workspace_data", {
    p_confirmation: parsed.data.confirmation,
  });
  if (error) {
    return actionError("UNKNOWN_ERROR", "删除工作区数据失败，数据未被标记为成功删除。");
  }
  return { ok: true, data: data as DeletedDataSummary };
}

export async function deleteAccountAction(input: {
  confirmation: string;
  password: string;
}): Promise<ActionResult<null>> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      "请输入 DELETE，并填写当前账户密码。",
    );
  }

  const { supabase, user } = await currentUser();
  if (!user?.email) {
    return actionError("AUTH_REQUIRED", "登录已过期，请重新登录。");
  }

  const { data: reauthenticated, error: reauthError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.password,
    });
  if (
    reauthError
    || !reauthenticated.user
    || !reauthenticated.session
    || reauthenticated.user.id !== user.id
  ) {
    return actionError("FORBIDDEN", "当前密码不正确，账户没有删除。");
  }

  // Use the access token issued by the password check explicitly. The SSR
  // client can still carry the request's older cookie-backed token until the
  // Server Action response commits its updated cookies.
  const { url, publishableKey } = getSupabaseConfig();
  const recentlyAuthenticated = createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${reauthenticated.session.access_token}`,
      },
    },
  });

  const { error } = await recentlyAuthenticated.rpc("delete_own_account", {
    p_confirmation: parsed.data.confirmation,
  });
  if (error) {
    const diagnosticCode = (error.code || "RPC_UNKNOWN")
      .replace(/[^A-Z0-9_]/gi, "")
      .slice(0, 32);
    return actionError(
      "UNKNOWN_ERROR",
      `账户删除失败，账户未被删除。诊断码：${diagnosticCode}`,
    );
  }

  await supabase.auth.signOut({ scope: "local" });
  return { ok: true, data: null };
}
