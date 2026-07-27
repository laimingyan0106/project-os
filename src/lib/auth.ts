import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .email("请输入有效的邮箱地址");

const password = z
  .string()
  .min(8, "密码至少需要 8 位")
  .regex(/[A-Za-z]/, "密码至少包含一个字母")
  .regex(/[0-9]/, "密码至少包含一个数字");

export const emailSchema = z.object({ email });
export const loginSchema = z.object({ email, password: z.string().min(1, "请输入密码") });
export const signupSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });
export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialAuthState: AuthActionState = { status: "idle" };

export function safeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
