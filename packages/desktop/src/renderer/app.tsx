import { useMantaWorkspace } from './use-manta-workspace';
import { ProjectSidebar } from './components/project-sidebar';
import { TaskListPanel } from './components/task-list-panel';
import { TaskDetailPanel } from './components/task-detail-panel';

export function App() {
  const workspace = useMantaWorkspace();

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-200">
      {workspace.error !== null && (
        <div className="border-b border-red-900 bg-red-950 px-4 py-2 font-mono text-xs text-red-300">
          [{workspace.error.code}] {workspace.error.message}
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
          selectedTaskId={workspace.selectedTask?.id ?? null}
          onSelectTask={(taskId) => void workspace.selectTask(taskId)}
          onAddTask={(title) => void workspace.addTask(title)}
        />
        <TaskDetailPanel
          task={workspace.selectedTask}
          onMoveTask={(targetStatus) => void workspace.moveSelectedTask(targetStatus)}
        />
      </div>
    </div>
  );
}
