import { useEffect, useState } from 'react';
import { useMantaWorkspace } from './use-manta-workspace';
import { ProjectSidebar } from './components/project-sidebar';
import { TaskListPanel } from './components/task-list-panel';
import { TaskDetailPanel } from './components/task-detail-panel';
import { CommandPalette, PaletteAction } from './components/command-palette';

export function App() {
  const workspace = useMantaWorkspace();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  const selectedTask = workspace.selectedTask;
  const paletteActions: PaletteAction[] = [];
  if (selectedTask !== null) {
    paletteActions.push({
      id: 'copy-context',
      label: `Copy AI Context — ${selectedTask.id}`,
      run: () => void workspace.copySelectedTaskContext(),
    });
    if (selectedTask.status !== 'in-progress') {
      paletteActions.push({
        id: 'start',
        label: `Start ${selectedTask.id} — ${selectedTask.title}`,
        run: () => void workspace.moveSelectedTask('in-progress'),
      });
    }
    if (selectedTask.status !== 'done') {
      paletteActions.push({
        id: 'done',
        label: `Done ${selectedTask.id} — ${selectedTask.title}`,
        run: () => void workspace.moveSelectedTask('done'),
      });
    }
  }

  return (
    <div className="relative flex h-screen flex-col bg-zinc-950 text-zinc-200">
      {workspace.error !== null && (
        <div className="border-b border-red-900 bg-red-950 px-4 py-2 font-mono text-xs text-red-300">
          [{workspace.error.code}] {workspace.error.message}
        </div>
      )}
      {workspace.notice !== null && (
        <div className="border-b border-emerald-900 bg-emerald-950 px-4 py-2 font-mono text-xs text-emerald-300">
          {workspace.notice}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={workspace.projects}
          selectedProjectRoot={workspace.selectedProjectRoot}
          onSelectProject={workspace.selectProject}
        />
        <TaskListPanel
          tasks={workspace.tasks}
          selectedTaskId={selectedTask?.id ?? null}
          onSelectTask={(taskId) => void workspace.selectTask(taskId)}
          onAddTask={(title) => void workspace.addTask(title)}
        />
        <TaskDetailPanel
          task={selectedTask}
          onMoveTask={(targetStatus) => void workspace.moveSelectedTask(targetStatus)}
          onSaveBody={workspace.saveSelectedTaskBody}
          onCopyContext={() => void workspace.copySelectedTaskContext()}
        />
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
        buildQueryAction={(query) =>
          query === ''
            ? null
            : {
                id: 'add-task',
                label: `Add task: "${query}"`,
                run: () => void workspace.addTask(query),
              }
        }
      />
    </div>
  );
}
