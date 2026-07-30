"use client";

import { useState } from "react";
import {
  Cloud,
  Database,
  Download,
  Import,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import {
  deleteAccountAction,
  deleteAllWorkspaceDataAction,
  updateProfileSettingsAction,
} from "@/app/(workspace)/settings/settings-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/project-os/page-header";
import { useProjectOS } from "@/components/project-os/project-os-provider";

const migrationLabel = {
  checking: "检查中",
  "not-found": "未发现本地快照",
  available: "可导入",
  importing: "导入中",
  success: "已完成",
  error: "检查失败",
};

export function SettingsView({
  userEmail,
  initialDisplayName,
  initialAvatarUrl,
}: {
  userEmail: string;
  initialDisplayName: string;
  initialAvatarUrl?: string;
}) {
  const {
    syncStatus,
    syncError,
    lastSyncedAt,
    refreshCloudState,
    localMigrationStatus,
    localMigrationSummary,
    openLocalMigration,
  } = useProjectOS();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [profileState, setProfileState] = useState<"idle" | "saving" | "saved">("idle");
  const [profileError, setProfileError] = useState<string>();
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [deleteDataConfirmation, setDeleteDataConfirmation] = useState("");
  const [deleteDataPending, setDeleteDataPending] = useState(false);
  const [deleteDataError, setDeleteDataError] = useState<string>();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [deleteAccountPending, setDeleteAccountPending] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function saveProfile() {
    setProfileState("saving");
    setProfileError(undefined);
    const result = await updateProfileSettingsAction({ displayName, avatarUrl });
    if (!result.ok) {
      setProfileState("idle");
      setProfileError(result.error.message);
      return;
    }
    setDisplayName(result.data.displayName);
    setAvatarUrl(result.data.avatarUrl ?? "");
    setProfileState("saved");
  }

  async function deleteAllData() {
    setDeleteDataPending(true);
    setDeleteDataError(undefined);
    const result = await deleteAllWorkspaceDataAction({
      confirmation: deleteDataConfirmation,
    });
    if (!result.ok) {
      setDeleteDataPending(false);
      setDeleteDataError(result.error.message);
      return;
    }
    await refreshCloudState();
    setDeleteDataPending(false);
    setDeleteDataOpen(false);
    setDeleteDataConfirmation("");
    setNotice(
      `工作区数据已删除：${result.data.projects} 个项目、${result.data.workflows} 个工作流、${result.data.prompts} 个 Prompt。账户仍然保留。`,
    );
  }

  async function deleteAccount() {
    setDeleteAccountPending(true);
    setDeleteAccountError(undefined);
    const result = await deleteAccountAction({
      confirmation: deleteAccountConfirmation,
      password,
    });
    if (!result.ok) {
      setDeleteAccountPending(false);
      setDeleteAccountError(result.error.message);
      return;
    }
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("project-os:")) {
        window.localStorage.removeItem(key);
      }
    }
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith("project-os:")) {
        window.sessionStorage.removeItem(key);
      }
    }
    window.location.assign("/login?account_deleted=1");
  }

  const initials = (displayName || userEmail).slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader
        eyebrow="System / Settings"
        title="账户、同步与数据控制"
        description="管理个人资料、云端同步、可移植数据和不可逆操作。"
        icon={Settings2}
      />

      {notice ? (
        <div role="status" className="mb-5 rounded-lg border border-emerald-400/25 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-card/70">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>账户资料</CardTitle>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="display-name" className="mb-2 block text-xs font-medium">显示名</label>
              <Input
                id="display-name"
                value={displayName}
                maxLength={120}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setProfileState("idle");
                }}
                aria-describedby={profileError ? "profile-error" : undefined}
              />
            </div>
            <div>
              <label htmlFor="avatar-url" className="mb-2 block text-xs font-medium">头像 URL</label>
              <Input
                id="avatar-url"
                type="url"
                value={avatarUrl}
                placeholder="https://"
                onChange={(event) => {
                  setAvatarUrl(event.target.value);
                  setProfileState("idle");
                }}
                aria-describedby="avatar-help"
              />
              <p id="avatar-help" className="mt-2 text-xs text-muted-foreground">只保存图片地址；加载头像时不发送来源页面信息。</p>
            </div>
            {profileError ? <p id="profile-error" role="alert" className="text-sm text-destructive">{profileError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={profileState === "saving"} onClick={() => void saveProfile()}>
                {profileState === "saving" ? <LoaderCircle className="animate-spin" /> : <Save />}
                {profileState === "saved" ? "已保存" : "保存资料"}
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="outline"><LogOut />退出登录</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cloud className="size-4 text-primary" />云同步</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[9px]">{syncStatus.toUpperCase()}</Badge>
                <span className="text-xs text-muted-foreground">
                  {lastSyncedAt ? `最后同步 ${new Date(lastSyncedAt).toLocaleString("zh-CN")}` : "尚未完成同步"}
                </span>
              </div>
              {syncError ? <p role="alert" className="mt-3 text-xs text-destructive">{syncError}</p> : null}
              <Button className="mt-4" size="sm" variant="outline" disabled={syncStatus === "syncing"} onClick={() => void refreshCloudState()}>
                {syncStatus === "syncing" ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                重新拉取云端数据
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="size-4 text-primary" />v0.1 本地数据</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">状态：{migrationLabel[localMigrationStatus]}</p>
              {localMigrationSummary ? (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  已导入 {localMigrationSummary.projects} 个项目、{localMigrationSummary.agents} 个 Agent 和 {localMigrationSummary.inbox} 条 Inbox。
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">可以选择 JSON 文件或粘贴旧站快照；导入具有服务端幂等保护。</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                disabled={localMigrationStatus === "checking" || localMigrationStatus === "importing"}
                onClick={() => openLocalMigration()}
              >
                <Import />{localMigrationStatus === "success" ? "再次导入 v0.1 数据" : "导入 v0.1 数据"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-5 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="size-4 text-primary" />数据可移植性</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">导出当前账户的完整 JSON</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">包括项目、工作流、Agent、Inbox、Prompt 版本、Knowledge、Skills、Resources 和 Activity。请求由 RLS 限制为当前用户。</p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a href="/api/export"><Download />下载 JSON</a>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-5 border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><ShieldCheck className="size-4" />危险区域</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-destructive/20 bg-background/35 p-4">
            <p className="text-sm font-medium">删除全部工作区数据</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">删除所有业务数据和活动记录，但保留登录账户与个人资料。操作在数据库事务内完成。</p>
            <Button className="mt-4" size="sm" variant="destructive" onClick={() => setDeleteDataOpen(true)}><Trash2 />删除全部数据</Button>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-background/35 p-4">
            <p className="text-sm font-medium">永久删除账户</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">需要当前密码重新认证，并输入 DELETE。账户与所有关联数据将永久删除。</p>
            <Button className="mt-4" size="sm" variant="destructive" onClick={() => setDeleteAccountOpen(true)}><UserRound />删除账户</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDataOpen} onOpenChange={setDeleteDataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除全部工作区数据？</DialogTitle>
            <DialogDescription>该操作无法撤销。建议先下载 JSON 导出。账户本身不会被删除。</DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="delete-data-confirmation" className="mb-2 block text-xs font-medium">输入 DELETE DATA</label>
            <Input
              id="delete-data-confirmation"
              autoFocus
              autoComplete="off"
              value={deleteDataConfirmation}
              onChange={(event) => setDeleteDataConfirmation(event.target.value)}
              aria-describedby={deleteDataError ? "delete-data-error" : "delete-data-help"}
            />
            <p id="delete-data-help" className="mt-2 text-xs text-muted-foreground">必须完全匹配英文大写确认词。</p>
            {deleteDataError ? <p id="delete-data-error" role="alert" className="mt-2 text-sm text-destructive">{deleteDataError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDataOpen(false)} disabled={deleteDataPending}>取消</Button>
            <Button variant="destructive" disabled={deleteDataPending || deleteDataConfirmation !== "DELETE DATA"} onClick={() => void deleteAllData()}>
              {deleteDataPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}永久删除数据
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>永久删除 Project OS 账户？</DialogTitle>
            <DialogDescription>账户、云端数据和登录凭据都会被删除。此操作无法恢复。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="delete-account-password" className="mb-2 block text-xs font-medium">当前密码</label>
              <Input
                id="delete-account-password"
                autoFocus
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={deleteAccountError ? "delete-account-error" : undefined}
              />
            </div>
            <div>
              <label htmlFor="delete-account-confirmation" className="mb-2 block text-xs font-medium">输入 DELETE</label>
              <Input
                id="delete-account-confirmation"
                autoComplete="off"
                value={deleteAccountConfirmation}
                onChange={(event) => setDeleteAccountConfirmation(event.target.value)}
                aria-describedby="delete-account-help"
              />
              <p id="delete-account-help" className="mt-2 text-xs text-muted-foreground">系统会先重新验证当前密码，再执行账户删除。</p>
            </div>
            {deleteAccountError ? <p id="delete-account-error" role="alert" className="text-sm text-destructive">{deleteAccountError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)} disabled={deleteAccountPending}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteAccountPending || deleteAccountConfirmation !== "DELETE" || password.length < 8}
              onClick={() => void deleteAccount()}
            >
              {deleteAccountPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}永久删除账户
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
