import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskListEntry, TaskStatus } from '@manta/core';
import type { ProjectSummary } from '../shared/manta-api';

export interface WorkspaceError {
  code: string;
  message: string;
}

/**
 * Local Workspace의 상태와 IPC 호출을 한 곳에 모은 훅.
 * 모든 변경(add/move)은 성공 후 task 목록을 다시 읽는다 —
 * 파일이 source of truth이므로 renderer가 자체 상태를 따로 진실로 삼지 않는다.
 */
export function useMantaWorkspace() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectRoot, setSelectedProjectRoot] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskListEntry[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [error, setError] = useState<WorkspaceError | null>(null);

  const reportFailure = useCallback((failure: { error: string; message: string }) => {
    setError({ code: failure.error, message: failure.message });
  }, []);

  const refreshTasks = useCallback(
    async (projectRoot: string) => {
      const result = await window.manta.listTasks(projectRoot);
      if (!result.ok) {
        reportFailure(result);
        return;
      }
      setTasks(result.tasks);
    },
    [reportFailure],
  );

  useEffect(() => {
    void (async () => {
      const result = await window.manta.listProjects();
      if (!result.ok) {
        reportFailure(result);
        return;
      }
      setProjects(result.projects);

      const firstAvailableProject = result.projects.find((project) => project.available);
      if (firstAvailableProject !== undefined) {
        setSelectedProjectRoot(firstAvailableProject.projectRoot);
      }
    })();
  }, [reportFailure]);

  useEffect(() => {
    if (selectedProjectRoot === null) {
      return;
    }
    setSelectedTask(null);
    setError(null);
    void refreshTasks(selectedProjectRoot);
  }, [selectedProjectRoot, refreshTasks]);

  const selectTask = useCallback(
    async (taskId: string) => {
      if (selectedProjectRoot === null) {
        return;
      }
      const result = await window.manta.readTask(selectedProjectRoot, taskId);
      if (!result.ok) {
        reportFailure(result);
        return;
      }
      setError(null);
      setSelectedTask(result.task);
    },
    [selectedProjectRoot, reportFailure],
  );

  const addTask = useCallback(
    async (title: string) => {
      if (selectedProjectRoot === null) {
        return;
      }
      const result = await window.manta.addTask(selectedProjectRoot, title);
      if (!result.ok) {
        reportFailure(result);
        return;
      }
      setError(null);
      await refreshTasks(selectedProjectRoot);
      setSelectedTask(result.task);
    },
    [selectedProjectRoot, refreshTasks, reportFailure],
  );

  const moveSelectedTask = useCallback(
    async (targetStatus: TaskStatus) => {
      if (selectedProjectRoot === null || selectedTask === null) {
        return;
      }
      const result = await window.manta.moveTask(
        selectedProjectRoot,
        selectedTask.id,
        targetStatus,
      );
      if (!result.ok) {
        reportFailure(result);
        return;
      }
      setError(null);
      await refreshTasks(selectedProjectRoot);
      await selectTask(selectedTask.id);
    },
    [selectedProjectRoot, selectedTask, refreshTasks, selectTask, reportFailure],
  );

  return {
    projects,
    selectedProjectRoot,
    selectProject: setSelectedProjectRoot,
    tasks,
    selectedTask,
    selectTask,
    addTask,
    moveSelectedTask,
    error,
  };
}
