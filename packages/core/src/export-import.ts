import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { TASK_STATUSES } from './constants';
import { MantaFailure, TaskStatus } from './types';
import { MantaErrors } from './errors';
import { readProjectAnchor, resolveTasksRootPath } from './project-anchor';
import { listTasks, readTask, allocateNextTaskId } from './task-repository';
import { serializeTaskFileContent } from './task-files';

/**
 * Phase 6: Import / Export v0.
 *
 * 외부 시스템(Jira, Notion, ...)은 원본이 아니라 bridge다. 그 bridge들이 딛고 설
 * 공통 포맷을 먼저 고정한다 — task 전체를 담는 자기 서술적 JSON 번들.
 * 같은 번들을 import하면 다른 Manta 프로젝트에서 task가 복원된다 (이식 가능성).
 */

export const EXPORT_BUNDLE_FORMAT = 'manta-tasks';
export const EXPORT_BUNDLE_VERSION = 1;

export interface ExportedTask {
  id: string;
  title: string;
  created: string;
  status: TaskStatus;
  body: string;
}

export interface TaskExportBundle {
  format: typeof EXPORT_BUNDLE_FORMAT;
  version: typeof EXPORT_BUNDLE_VERSION;
  projectId: string | null;
  tasks: ExportedTask[];
}

export interface SkippedExportTask {
  id: string;
  reason: string;
}

export interface ExportTasksResult {
  bundle: TaskExportBundle;
  /** 내보내지 못한 task. 번들(stdout JSON)을 오염시키지 않도록 따로 보고한다. */
  skipped: SkippedExportTask[];
}

export async function exportTasks(projectRoot: string): Promise<ExportTasksResult> {
  const anchor = await readProjectAnchor(projectRoot);
  const tasksRootPath = await resolveTasksRootPath(projectRoot);

  const exportedTasks: ExportedTask[] = [];
  const skipped: SkippedExportTask[] = [];

  for (const entry of await listTasks(tasksRootPath)) {
    const readResult = await readTask(tasksRootPath, entry.id);
    if (!readResult.ok) {
      skipped.push({ id: entry.id, reason: readResult.message });
      continue;
    }
    const { task } = readResult;
    exportedTasks.push({
      id: task.id,
      title: task.title,
      created: task.created,
      status: task.status,
      body: task.body,
    });
  }

  return {
    bundle: {
      format: EXPORT_BUNDLE_FORMAT,
      version: EXPORT_BUNDLE_VERSION,
      projectId: anchor?.projectId ?? null,
      tasks: exportedTasks,
    },
    skipped,
  };
}

export interface ImportedTaskMapping {
  sourceId: string;
  newId: string;
  status: TaskStatus;
}

export type ImportTasksResult = { ok: true; imported: ImportedTaskMapping[] } | MantaFailure;

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

function validateBundleShape(bundle: unknown): string | null {
  if (typeof bundle !== 'object' || bundle === null) {
    return 'not a JSON object';
  }
  const candidate = bundle as Record<string, unknown>;
  if (candidate.format !== EXPORT_BUNDLE_FORMAT) {
    return `unknown format: ${String(candidate.format)}`;
  }
  if (candidate.version !== EXPORT_BUNDLE_VERSION) {
    return `unsupported version: ${String(candidate.version)}`;
  }
  if (!Array.isArray(candidate.tasks)) {
    return 'tasks must be an array';
  }
  for (const [index, task] of (candidate.tasks as unknown[]).entries()) {
    const taskCandidate = task as Record<string, unknown>;
    if (typeof taskCandidate?.title !== 'string' || taskCandidate.title.trim() === '') {
      return `tasks[${index}]: title must be a non-empty string`;
    }
    if (!isTaskStatus(taskCandidate.status)) {
      return `tasks[${index}]: status must be one of ${TASK_STATUSES.join(', ')}`;
    }
    if (typeof taskCandidate.created !== 'string' || typeof taskCandidate.body !== 'string') {
      return `tasks[${index}]: created and body must be strings`;
    }
  }
  return null;
}

/**
 * 번들의 task들을 새 id로 가져온다.
 *
 * 원본 id는 보존하지 않는다 — 이 프로젝트의 id 공간은 단조 증가 규칙(task-13)을
 * 따라야 하고, 기존 task와의 충돌이 원천적으로 없어야 한다. 대신 sourceId → newId
 * 매핑을 돌려줘서 호출자가 추적할 수 있게 한다.
 */
export async function importTasks(
  tasksRootPath: string,
  bundle: unknown,
): Promise<ImportTasksResult> {
  const shapeError = validateBundleShape(bundle);
  if (shapeError !== null) {
    return { ok: false, ...MantaErrors.IMPORT_BUNDLE_INVALID(shapeError) };
  }
  const validBundle = bundle as TaskExportBundle;

  const firstNewId = await allocateNextTaskId(tasksRootPath);
  let nextIdNumber = Number(firstNewId.slice('task-'.length));

  const imported: ImportedTaskMapping[] = [];
  for (const exportedTask of validBundle.tasks) {
    const newId = `task-${nextIdNumber}`;
    nextIdNumber += 1;

    const filePath = path.join(tasksRootPath, exportedTask.status, `${newId}.md`);
    const fileContent = serializeTaskFileContent(
      { id: newId, title: exportedTask.title, created: exportedTask.created },
      exportedTask.body,
    );

    try {
      await fs.writeFile(filePath, fileContent, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return { ok: false, ...MantaErrors.PERMISSION_DENIED(tasksRootPath) };
      }
      return {
        ok: false,
        error: 'UNKNOWN',
        message: error instanceof Error ? error.message : String(error),
      };
    }

    imported.push({
      sourceId: typeof exportedTask.id === 'string' ? exportedTask.id : '(unknown)',
      newId,
      status: exportedTask.status,
    });
  }

  return { ok: true, imported };
}
