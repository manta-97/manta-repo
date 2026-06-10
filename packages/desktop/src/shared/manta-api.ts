import type { MantaFailure, ProjectEntry, Task, TaskListEntry, TaskStatus } from '@manta/core';

/**
 * main ↔ renderer 사이의 IPC 계약.
 *
 * GUI는 CLI를 shell로 호출하거나 stdout을 파싱하지 않는다.
 * main process가 @manta/core를 직접 호출하고, core의 Result를 그대로 renderer에 전달한다.
 * 실패가 예외가 아니라 값이므로 renderer는 오류 코드로 분기할 수 있다 (CLI와 같은 규약).
 */

export interface ProjectSummary extends ProjectEntry {
  /** 레지스트리에 있지만 폴더가 사라졌을 수 있다. `.manta/` 존재 여부로 판단한다. */
  available: boolean;
}

/**
 * core의 TASK_STATUSES와 같은 값. renderer는 브라우저 컨텍스트라
 * node 코드가 섞인 @manta/core에서 값을 import할 수 없어 여기에 복제한다.
 * (이 파일은 core에서 타입만 가져오므로 모든 프로세스에서 안전하다)
 */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = ['todo', 'in-progress', 'done'];

export type ListProjectsResult = { ok: true; projects: ProjectSummary[] } | MantaFailure;
export type ListTasksResult = { ok: true; tasks: TaskListEntry[] } | MantaFailure;
export type ReadTaskResult = { ok: true; task: Task } | MantaFailure;
export type AddTaskResult = { ok: true; task: Task } | MantaFailure;
export type MoveTaskResult =
  | { ok: true; id: string; from: TaskStatus; to: TaskStatus; moved: boolean }
  | MantaFailure;

export const MANTA_IPC_CHANNELS = {
  listProjects: 'manta:list-projects',
  listTasks: 'manta:list-tasks',
  readTask: 'manta:read-task',
  addTask: 'manta:add-task',
  moveTask: 'manta:move-task',
} as const;

export interface MantaApi {
  listProjects(): Promise<ListProjectsResult>;
  listTasks(projectRoot: string): Promise<ListTasksResult>;
  readTask(projectRoot: string, taskId: string): Promise<ReadTaskResult>;
  addTask(projectRoot: string, title: string): Promise<AddTaskResult>;
  moveTask(projectRoot: string, taskId: string, targetStatus: TaskStatus): Promise<MoveTaskResult>;
}

declare global {
  interface Window {
    manta: MantaApi;
  }
}
