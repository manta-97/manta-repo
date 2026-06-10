import { useState } from 'react';
import type { TaskListEntry } from '@manta/core';
import { TASK_STATUS_ORDER } from '../../shared/manta-api';

interface TaskListPanelProps {
  tasks: TaskListEntry[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onAddTask: (title: string) => void;
}

const STATUS_DOT_CLASSES: Record<string, string> = {
  todo: 'bg-zinc-500',
  'in-progress': 'bg-amber-400',
  done: 'bg-emerald-500',
};

export function TaskListPanel({
  tasks,
  selectedTaskId,
  onSelectTask,
  onAddTask,
}: TaskListPanelProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  function submitNewTask() {
    const title = newTaskTitle.trim();
    if (title === '') {
      return;
    }
    onAddTask(title);
    setNewTaskTitle('');
  }

  return (
    <section className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 p-3">
        <input
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submitNewTask();
            }
          }}
          placeholder="New task title — press Enter"
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {TASK_STATUS_ORDER.map((status) => {
          const tasksInStatus = tasks.filter((task) => task.status === status);
          return (
            <div key={status}>
              <div className="flex items-center gap-2 px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[status]}`} />
                {status}
                <span className="text-zinc-600">{tasksInStatus.length}</span>
              </div>
              {tasksInStatus.map((task) => {
                const isSelected = task.id === selectedTaskId;
                return (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className={`block w-full px-3 py-1.5 text-left ${
                      isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <span className="mr-2 font-mono text-xs text-zinc-500">{task.id}</span>
                    <span
                      className={`text-sm ${task.malformed ? 'italic text-red-400' : 'text-zinc-200'}`}
                    >
                      {task.malformed ? '(malformed task file)' : task.title}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
