import { useEffect, useState } from 'react';
import type { Task, TaskStatus } from '@manta/core';

interface TaskDetailPanelProps {
  task: Task | null;
  onMoveTask: (targetStatus: TaskStatus) => void;
  onSaveBody: (newBody: string) => Promise<boolean>;
  onCopyContext: () => void;
}

/**
 * 선택한 task의 미리보기 + 본문 편집.
 * cli-design.md Phase 4 계약: 명시적 save action 없이는 파일을 변경하지 않는다 —
 * 편집은 draft 상태에만 머물고, Save를 눌러야 파일에 닿는다.
 */
export function TaskDetailPanel({
  task,
  onMoveTask,
  onSaveBody,
  onCopyContext,
}: TaskDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBody, setDraftBody] = useState('');

  // 다른 task를 선택하면 진행 중이던 편집은 폐기한다.
  useEffect(() => {
    setIsEditing(false);
  }, [task?.id]);

  if (task === null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-600">Select a task to preview it.</p>
      </main>
    );
  }

  function startEditing() {
    setDraftBody(task!.body);
    setIsEditing(true);
  }

  async function saveDraft() {
    const saved = await onSaveBody(draftBody);
    if (saved) {
      setIsEditing(false);
    }
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
            <button
              onClick={onCopyContext}
              className="rounded border border-sky-500/40 px-3 py-1 text-sm text-sky-300 hover:bg-sky-500/10"
            >
              Copy AI Context
            </button>
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

      {isEditing ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                void saveDraft();
              }
            }}
            autoFocus
            spellCheck={false}
            className="flex-1 resize-none bg-zinc-950 px-6 py-4 font-mono text-sm leading-relaxed text-zinc-200 focus:outline-none"
          />
          <div className="flex gap-2 border-t border-zinc-800 px-6 py-3">
            <button
              onClick={() => void saveDraft()}
              className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900"
            >
              Cancel
            </button>
            <span className="self-center text-xs text-zinc-600">⌘S to save</span>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {task.body.trim() === '' ? (
              <p className="text-sm italic text-zinc-600">(no body)</p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-300">
                {task.body}
              </pre>
            )}
          </div>
          <div className="border-t border-zinc-800 px-6 py-3">
            <button
              onClick={startEditing}
              className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Edit body
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
