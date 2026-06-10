import * as fs from 'node:fs/promises';
import { listTasks, readProjectAnchor, resolveTasksRootPath } from '@manta/core';
import { getRootDatabasePath, openRootDatabase } from './root-database';
import { hashFileContent } from './file-hash';

export type IndexIssueType =
  | 'database-missing'
  | 'project-path-missing'
  | 'anchor-missing'
  | 'project-id-mismatch'
  | 'task-file-missing'
  | 'task-file-changed'
  | 'task-not-indexed';

export interface IndexIssue {
  type: IndexIssueType;
  detail: string;
}

export interface CheckIndexResult {
  ok: boolean;
  databasePath: string;
  projectCount: number;
  taskCount: number;
  issues: IndexIssue[];
}

interface ProjectRow {
  project_id: string;
  last_seen_path: string;
}

interface TaskRow {
  project_id: string;
  id: string;
  path: string;
  hash: string;
}

/**
 * root DB가 파일 시스템의 현재 상태와 맞는지 검증한다.
 * 파일이 source of truth이므로 불일치는 항상 "DB가 낡았다"는 뜻이고,
 * 처방은 한 가지다: `manta index rebuild`.
 */
export async function checkIndex(
  globalDataDir: string,
  databasePath: string = getRootDatabasePath(globalDataDir),
): Promise<CheckIndexResult> {
  const databaseExists = await fs.stat(databasePath).then(
    (stat) => stat.isFile(),
    () => false,
  );
  if (!databaseExists) {
    return {
      ok: false,
      databasePath,
      projectCount: 0,
      taskCount: 0,
      issues: [
        {
          type: 'database-missing',
          detail: `Root database not found at ${databasePath}. Run \`manta index rebuild\`.`,
        },
      ],
    };
  }

  const database = openRootDatabase(databasePath);
  let projectRows: ProjectRow[];
  let taskRows: TaskRow[];
  try {
    projectRows = database
      .prepare('SELECT project_id, last_seen_path FROM projects')
      .all() as ProjectRow[];
    taskRows = database.prepare('SELECT project_id, id, path, hash FROM tasks').all() as TaskRow[];
  } finally {
    database.close();
  }

  const issues: IndexIssue[] = [];

  for (const projectRow of projectRows) {
    const projectPathExists = await fs.stat(projectRow.last_seen_path).then(
      (stat) => stat.isDirectory(),
      () => false,
    );
    if (!projectPathExists) {
      issues.push({
        type: 'project-path-missing',
        detail: `${projectRow.project_id}: last seen path does not exist: ${projectRow.last_seen_path}`,
      });
      continue;
    }

    const anchor = await readProjectAnchor(projectRow.last_seen_path);
    if (anchor === null) {
      issues.push({
        type: 'anchor-missing',
        detail: `${projectRow.project_id}: no .manta/project.json at ${projectRow.last_seen_path}`,
      });
      continue;
    }
    if (anchor.projectId !== projectRow.project_id) {
      issues.push({
        type: 'project-id-mismatch',
        detail: `${projectRow.last_seen_path}: anchor has ${anchor.projectId}, index has ${projectRow.project_id}`,
      });
      continue;
    }

    // DB에 없는 파일 찾기 — 인덱스 이후 추가된 task.
    const indexedTaskIds = new Set(
      taskRows
        .filter((taskRow) => taskRow.project_id === projectRow.project_id)
        .map((taskRow) => taskRow.id),
    );
    const tasksRootPath = await resolveTasksRootPath(projectRow.last_seen_path);
    const taskEntries = await listTasks(tasksRootPath);
    for (const taskEntry of taskEntries) {
      if (!indexedTaskIds.has(taskEntry.id)) {
        issues.push({
          type: 'task-not-indexed',
          detail: `${projectRow.project_id}/${taskEntry.id}: file exists but is not in the index`,
        });
      }
    }
  }

  for (const taskRow of taskRows) {
    let fileContent: string;
    try {
      fileContent = await fs.readFile(taskRow.path, 'utf-8');
    } catch {
      issues.push({
        type: 'task-file-missing',
        detail: `${taskRow.project_id}/${taskRow.id}: indexed file is gone: ${taskRow.path}`,
      });
      continue;
    }

    if (hashFileContent(fileContent) !== taskRow.hash) {
      issues.push({
        type: 'task-file-changed',
        detail: `${taskRow.project_id}/${taskRow.id}: file changed since last index: ${taskRow.path}`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    databasePath,
    projectCount: projectRows.length,
    taskCount: taskRows.length,
    issues,
  };
}
