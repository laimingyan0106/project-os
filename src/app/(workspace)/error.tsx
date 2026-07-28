"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div>
        <TriangleAlert className="mx-auto size-9 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">云端工作区加载失败</h1>
        <p className="mt-2 text-sm text-muted-foreground">请检查网络连接或数据库迁移，然后重试。</p>
        <Button className="mt-5" onClick={unstable_retry}><RefreshCw />重新加载</Button>
      </div>
    </div>
  );
}
