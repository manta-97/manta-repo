import { useEffect, useState } from 'react';

export interface PaletteAction {
  id: string;
  label: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
  /** 검색어가 액션과 안 맞을 때 동적으로 만들어지는 액션 (예: Add task: "..."). */
  buildQueryAction?: (query: string) => PaletteAction | null;
}

/**
 * ⌘K command palette (Phase 4).
 * AI context를 상시 패널이 아니라 on-demand action으로 두는 자리가 여기다.
 */
export function CommandPalette({ open, onClose, actions, buildQueryAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchingActions = actions.filter(
    (action) => normalizedQuery === '' || action.label.toLowerCase().includes(normalizedQuery),
  );
  const queryAction = buildQueryAction?.(query.trim()) ?? null;
  const visibleActions = queryAction !== null ? [...matchingActions, queryAction] : matchingActions;

  function runAction(action: PaletteAction) {
    onClose();
    action.run();
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 pt-32"
      onClick={onClose}
    >
      <div
        className="w-[480px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onClose();
            }
            if (event.key === 'Enter' && visibleActions.length > 0) {
              runAction(visibleActions[0]);
            }
          }}
          autoFocus
          placeholder="Type a command or a new task title…"
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
        <div className="max-h-72 overflow-y-auto py-1">
          {visibleActions.length === 0 && (
            <p className="px-4 py-2 text-sm text-zinc-600">No matching commands.</p>
          )}
          {visibleActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => runAction(action)}
              className={`block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 ${
                index === 0 ? 'bg-zinc-800/60' : ''
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
