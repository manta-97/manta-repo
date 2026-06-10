import { MantaErrorCode } from './errors';
import { TASK_STATUSES } from './constants';

export type MantaFailure = {
  ok: false;
  error: MantaErrorCode | 'UNKNOWN';
  message: string;
};

export type InitResult =
  | { ok: true; projectRoot: string; taskDirPath: string; projectId: string; created: boolean }
  | MantaFailure;

export interface ProjectEntry {
  projectId: string;
  name: string;
  projectRoot: string;
  taskDirName: string;
  registeredAt: string;
}

/**
 * `.manta/project.json` — 프로젝트 영구 anchor.
 * 프로젝트 폴더가 이동되어도 `projectId`로 root DB의 기존 기록과 다시 연결한다.
 * `taskDir`는 프로젝트 루트 기준 task 디렉토리 상대 경로 (기본값 `manta`).
 */
export interface ProjectAnchor {
  projectId: string;
  schemaVersion: number;
  createdAt: string;
  taskDir: string;
}

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskRef {
  id: string;
  status: TaskStatus;
  filePath: string;
}

/**
 * `manta list`용 요약 항목. frontmatter를 읽지 못한 파일도 목록에서 사라지지 않도록
 * `malformed` 플래그로 표시한다 — 목록 전체가 한 파일 때문에 실패하면 안 된다.
 */
export interface TaskListEntry extends TaskRef {
  title: string | null;
  created: string | null;
  malformed: boolean;
}

export interface Task extends TaskRef {
  title: string;
  created: string;
  body: string;
}

export interface TaskSearchMatch {
  id: string;
  status: TaskStatus;
  title: string;
  snippet: string | null;
}

export type TaskRefResult = { ok: true; ref: TaskRef } | MantaFailure;
export type TaskReadResult = { ok: true; task: Task } | MantaFailure;
export type TaskCreateResult = { ok: true; task: Task } | MantaFailure;
export type TaskMoveResult =
  | { ok: true; id: string; from: TaskStatus; to: TaskStatus; moved: boolean; filePath: string }
  | MantaFailure;
