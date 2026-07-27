"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { KeyRound, LoaderCircle, Mail, WandSparkles } from "lucide-react";
import {
  forgotPasswordAction,
  loginAction,
  magicLinkAction,
  signupAction,
  updatePasswordAction,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialAuthState, type AuthActionState } from "@/lib/auth";
import { cn } from "@/lib/utils";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-xs text-destructive">{errors[0]}</p>;
}

function ResultMessage({ state }: { state: AuthActionState }) {
  if (!state.message) return null;
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm leading-5",
        state.status === "success"
          ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-200"
          : "border-destructive/20 bg-destructive/8 text-destructive",
      )}
    >
      {state.message}
    </div>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function LoginForms({ nextPath, initialError }: { nextPath: string; initialError?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialAuthState);
  const [magicState, magicFormAction, magicPending] = useActionState(magicLinkAction, initialAuthState);

  return (
    <div className="space-y-5">
      {initialError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
          {initialError}
        </div>
      ) : null}
      <div className="grid grid-cols-2 rounded-lg border bg-background/50 p-1">
        <button type="button" onClick={() => setMode("password")} className={cn("rounded-md px-3 py-2 text-xs transition", mode === "password" && "bg-accent text-foreground")}>密码登录</button>
        <button type="button" onClick={() => setMode("magic")} className={cn("rounded-md px-3 py-2 text-xs transition", mode === "magic" && "bg-accent text-foreground")}>Magic Link</button>
      </div>

      {mode === "password" ? (
        <form action={loginFormAction} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={nextPath} />
          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">邮箱</span>
            <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-10" />
            <FieldError errors={loginState.fieldErrors?.email} />
          </label>
          <label className="block text-sm">
            <span className="mb-2 flex items-center justify-between text-muted-foreground">
              密码
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">忘记密码？</Link>
            </span>
            <Input name="password" type="password" autoComplete="current-password" className="h-10" />
            <FieldError errors={loginState.fieldErrors?.password} />
          </label>
          <ResultMessage state={loginState} />
          <SubmitButton pending={loginPending}><KeyRound />进入工作区</SubmitButton>
        </form>
      ) : (
        <form action={magicFormAction} className="space-y-4" noValidate>
          <label className="block text-sm">
            <span className="mb-2 block text-muted-foreground">邮箱</span>
            <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-10" />
            <FieldError errors={magicState.fieldErrors?.email} />
          </label>
          <p className="text-xs leading-5 text-muted-foreground">我们会发送一次性登录链接，无需输入密码。</p>
          <ResultMessage state={magicState} />
          <SubmitButton pending={magicPending}><WandSparkles />发送登录链接</SubmitButton>
        </form>
      )}
    </div>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialAuthState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <label className="block text-sm">
        <span className="mb-2 block text-muted-foreground">邮箱</span>
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-10" />
        <FieldError errors={state.fieldErrors?.email} />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-muted-foreground">密码</span>
        <Input name="password" type="password" autoComplete="new-password" className="h-10" />
        <FieldError errors={state.fieldErrors?.password} />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-muted-foreground">确认密码</span>
        <Input name="confirmPassword" type="password" autoComplete="new-password" className="h-10" />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">至少 8 位，并同时包含字母和数字。</p>
      <ResultMessage state={state} />
      <SubmitButton pending={pending}><Mail />创建账户</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialAuthState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {initialError ? <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">{initialError}</div> : null}
      <label className="block text-sm">
        <span className="mb-2 block text-muted-foreground">账户邮箱</span>
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-10" />
        <FieldError errors={state.fieldErrors?.email} />
      </label>
      <ResultMessage state={state} />
      <SubmitButton pending={pending}><Mail />发送重置邮件</SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialAuthState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <label className="block text-sm">
        <span className="mb-2 block text-muted-foreground">新密码</span>
        <Input name="password" type="password" autoComplete="new-password" className="h-10" />
        <FieldError errors={state.fieldErrors?.password} />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-muted-foreground">确认新密码</span>
        <Input name="confirmPassword" type="password" autoComplete="new-password" className="h-10" />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </label>
      <ResultMessage state={state} />
      <SubmitButton pending={pending}><KeyRound />保存新密码</SubmitButton>
    </form>
  );
}
