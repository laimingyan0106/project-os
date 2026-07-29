"use client";

import { useMemo, useState } from "react";
import {
  ArchiveRestore,
  FileJson,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  type LocalMigrationSummary,
  parseLegacyV1Snapshot,
} from "@/lib/migration/v1-snapshot";

export function LocalMigrationDialog({
  open,
  dialogKey,
  initialSourceJson,
  importing,
  error,
  summary,
  onOpenChange,
  onImport,
  onSkip,
}: {
  open: boolean;
  dialogKey: number;
  initialSourceJson?: string;
  importing: boolean;
  error?: string;
  summary?: LocalMigrationSummary;
  onOpenChange: (open: boolean) => void;
  onImport: (sourceJson: string, allowSeedImport: boolean) => Promise<void>;
  onSkip: () => void;
}) {
  return (
    <LocalMigrationDialogBody
      key={dialogKey}
      open={open}
      initialSourceJson={initialSourceJson}
      importing={importing}
      error={error}
      summary={summary}
      onOpenChange={onOpenChange}
      onImport={onImport}
      onSkip={onSkip}
    />
  );
}

function LocalMigrationDialogBody({
  open,
  initialSourceJson,
  importing,
  error,
  summary,
  onOpenChange,
  onImport,
  onSkip,
}: Omit<Parameters<typeof LocalMigrationDialog>[0], "dialogKey">) {
  const [sourceJson, setSourceJson] = useState(initialSourceJson ?? "");
  const [seedConfirmed, setSeedConfirmed] = useState(false);
  const parsed = useMemo(
    () => sourceJson.trim() ? parseLegacyV1Snapshot(sourceJson) : null,
    [sourceJson],
  );

  const counts = parsed?.ok
    ? {
        projects: parsed.snapshot.projects.length,
        agents: parsed.snapshot.agents.length,
        inbox: parsed.snapshot.inbox.length,
        nodes: parsed.snapshot.workflow.nodes.length,
        edges: parsed.snapshot.workflow.edges.length,
      }
    : null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5_500_000) {
      setSourceJson("");
      return;
    }
    setSourceJson(await file.text());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!importing) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveRestore className="size-5 text-primary" />
            导入 Project OS v0.1 数据
          </DialogTitle>
          <DialogDescription>
            导入会与当前云端数据合并，不会覆盖同编号记录。成功后原始 JSON
            会在本浏览器保留 30 天备份。
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <ShieldCheck className="size-4" />
              {summary.alreadyImported ? "该快照已导入" : "云端导入完成"}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <SummaryItem label="项目" value={summary.projects} />
              <SummaryItem label="Agent" value={summary.agents} />
              <SummaryItem label="Inbox" value={summary.inbox} />
              <SummaryItem label="工作流" value={summary.workflows} />
              <SummaryItem label="节点 / 连线" value={`${summary.nodes} / ${summary.edges}`} />
              <SummaryItem label="冲突副本" value={summary.conflictCopies} />
            </div>
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 px-4 py-5 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
              <FileJson className="size-4" />
              选择 v0.1 JSON 文件
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                disabled={importing}
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>

            <div>
              <label htmlFor="migration-json" className="mb-2 block text-xs text-muted-foreground">
                或粘贴 localStorage 中 project-os:v1 的完整 JSON
              </label>
              <Textarea
                id="migration-json"
                value={sourceJson}
                disabled={importing}
                onChange={(event) => setSourceJson(event.target.value)}
                placeholder='{"projects":[],"agents":[],"inbox":[],"workflow":{...}}'
                className="min-h-36 font-mono text-xs"
                aria-describedby="migration-json-status"
              />
              <p
                id="migration-json-status"
                role={parsed && !parsed.ok ? "alert" : undefined}
                className={`mt-2 text-xs ${parsed && !parsed.ok ? "text-destructive" : "text-muted-foreground"}`}
              >
                {!parsed
                  ? "当前域名检测到旧数据时会自动填入；预览域名可手动导入。"
                  : parsed.ok
                    ? `已识别：${counts?.projects} 个项目、${counts?.agents} 个 Agent、${counts?.inbox} 条 Inbox、${counts?.nodes} 个节点、${counts?.edges} 条连线。`
                    : parsed.message}
              </p>
            </div>

            {parsed?.ok && parsed.isSeedEquivalent ? (
              <label className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/5 p-4 text-xs leading-5">
                <input
                  type="checkbox"
                  checked={seedConfirmed}
                  disabled={importing}
                  onChange={(event) => setSeedConfirmed(event.target.checked)}
                  className="mt-0.5 size-4 accent-amber-400"
                />
                <span>
                  这是 v0.1 未修改的示例数据。默认不导入；如确实需要示例，请勾选确认。
                </span>
              </label>
            ) : null}

          </>
        )}

        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {summary ? (
            <Button onClick={() => onOpenChange(false)}>完成</Button>
          ) : (
            <>
              <Button variant="ghost" disabled={importing} onClick={onSkip}>
                跳过并保留快照
              </Button>
              <Button
                disabled={
                  importing
                  || !parsed?.ok
                  || (parsed.isSeedEquivalent && !seedConfirmed)
                }
                onClick={() => {
                  if (parsed?.ok) {
                    void onImport(sourceJson, parsed.isSeedEquivalent && seedConfirmed);
                  }
                }}
              >
                {importing ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <UploadCloud />
                )}
                导入并合并
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-background/50 px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
