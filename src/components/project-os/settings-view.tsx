"use client";

import {
  Cloud,
  Database,
  Import,
  LoaderCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function SettingsView({ userEmail }: { userEmail: string }) {
  const {
    syncStatus,
    syncError,
    lastSyncedAt,
    refreshCloudState,
    localMigrationStatus,
    localMigrationSummary,
    openLocalMigration,
  } = useProjectOS();

  return (
    <>
      <PageHeader
        eyebrow="System / Settings"
        title="账户、同步与数据迁移"
        description="查看云端连接状态，并显式导入 Project OS v0.1 浏览器数据。"
        icon={Settings2}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="bg-card/70">
          <CardHeader>
            <div className="mb-5 grid size-10 place-items-center rounded-lg border bg-background">
              <UserRound className="size-4 text-primary" />
            </div>
            <CardTitle>当前账户</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Supabase 登录邮箱</p>
            <p className="mt-2 break-all font-mono text-xs">{userEmail}</p>
            <Badge variant="outline" className="mt-5 font-mono text-[9px] text-emerald-300">
              AUTHENTICATED
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardHeader>
            <div className="mb-5 grid size-10 place-items-center rounded-lg border bg-background">
              <Cloud className="size-4 text-primary" />
            </div>
            <CardTitle>云同步</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              最后同步：{lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleString("zh-CN")
                : "尚未完成"}
            </p>
            {syncError ? (
              <p role="alert" className="mt-2 text-xs text-destructive">{syncError}</p>
            ) : null}
            <div className="mt-5 flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[9px]">
                {syncStatus.toUpperCase()}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={syncStatus === "syncing"}
                onClick={() => void refreshCloudState()}
              >
                {syncStatus === "syncing"
                  ? <LoaderCircle className="animate-spin" />
                  : <RefreshCw />}
                重新拉取
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardHeader>
            <div className="mb-5 grid size-10 place-items-center rounded-lg border bg-background">
              <Database className="size-4 text-primary" />
            </div>
            <CardTitle>v0.1 本地数据</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              状态：{migrationLabel[localMigrationStatus]}
            </p>
            {localMigrationSummary ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                已导入 {localMigrationSummary.projects} 个项目、
                {localMigrationSummary.agents} 个 Agent 和
                {localMigrationSummary.inbox} 条 Inbox。
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Preview 域名无法读取旧正式域名的 localStorage，可选择 JSON 文件或粘贴内容。
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-5"
              disabled={
                localMigrationStatus === "checking"
                || localMigrationStatus === "importing"
                || localMigrationStatus === "success"
              }
              onClick={() => openLocalMigration()}
            >
              <Import />
              导入 v0.1 数据
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            数据安全边界
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
          <p>云端数据由 Supabase RLS 按账户隔离。</p>
          <p>迁移失败不会删除原始 localStorage 快照。</p>
          <p>导入成功后，本浏览器保留 30 天可恢复备份。</p>
        </CardContent>
      </Card>
    </>
  );
}
