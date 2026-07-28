export default function WorkspaceLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="正在加载云端工作区">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-8 w-80 max-w-full rounded bg-muted" />
        <div className="h-4 w-[520px] max-w-full rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-40 rounded-xl border bg-card/60" />
        ))}
      </div>
    </div>
  );
}
