import type { Task, TaskStatus } from '@manta/core';

interface TaskDetailPanelProps {
  task: Task | null;
  onMoveTask: (targetStatus: TaskStatus) => void;
}

/**
 * 선택한 task의 read-only 미리보기.
 * cli-design.md Phase 4 계약: preview는 read-only이며,
 * 명시적 save action 없이는 파일을 변경하지 않는다 (편집은 이후 버전에서).
 */
export function TaskDetailPanel({ task, onMoveTask }: TaskDetailPanelProps) {
  if (task === null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-600">Select a task to preview it.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-zinc-100">
            <span className="mr-3 font-mono text-sm text-zinc-500">{task.id}</span>
            {task.title}
          </h1>
          <div className="flex shrink-0 gap-2">
            {task.status !== 'in-progress' && (
              <button
                onClick={() => onMoveTask('in-progress')}
                className="rounded border border-amber-500/40 px-3 py-1 text-sm text-amber-300 hover:bg-amber-500/10"
              >
                Start
              </button>
            )}
            {task.status !== 'done' && (
              <button
                onClick={() => onMoveTask('done')}
                className="rounded border border-emerald-500/40 px-3 py-1 text-sm text-emerald-300 hover:bg-emerald-500/10"
              >
                Done
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          {task.status} · created {task.created} · {task.filePath}
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {task.body.trim() === '' ? (
          <p className="text-sm italic text-zinc-600">(no body)</p>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-300">
            {task.body}
          </pre>
        )}
      </div>
    </main>
  );
}
