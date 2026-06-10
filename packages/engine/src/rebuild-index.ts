import * as fs from 'node:fs/promises';
import {
  listTasks,
  parseTaskFileContent,
  readProjectAnchor,
  readProjectRegistry,
  resolveTasksRootPath,
} from '@manta/core';
import { getRootDatabasePath, openRootDatabase } from './root-database';
import { hashFileContent } from './file-hash';

export interface SkippedProject {
  projectRoot: string;
  reason: string;
}

export interface RebuildIndexResult {
  databasePath: string;
  projectCount: number;
  taskCount: number;
  skipped: SkippedProject[];
}

interface ProjectRow {
  project_id: string;
  name: string;
  last_seen_path: string;
  task_dir: string;
  indexed_at: string;
}

interface TaskRow {
  project_id: string;
  id: string;
  title: string | null;
  status: string;
  created: string | null;
  path: string;
  hash: string;
  body_text: string | null;
}

/**
 * 프로젝트 레지스트리(`projects.json`)와 각 프로젝트의 anchor/task 파일을 스캔해
 * root SQLite를 처음부터 다시 만든다.
 *
 * 증분 갱신 대신 전체 재생성을 선택한 이유: 파일이 source of truth이므로
 * DB가 의심스러우면 지우고 다시 만드는 것이 가장 단순하고 신뢰할 수 있는 복구 경로다.
 * 프로젝트 수가 수백 개 규모가 되기 전까지는 성능도 문제가 아니다.
 */
export async function rebuildIndex(
  globalDataDir: string,
  databasePath: string = getRootDatabasePath(globalDataDir),
): Promise<RebuildIndexResult> {
  const registryEntries = await readProjectRegistry(globalDataDir);

  const projectRows: ProjectRow[] = [];
  const taskRows: TaskRow[] = [];
  const skipped: SkippedProject[] = [];
  const indexedAt = new Date().toISOString();

  for (const registryEntry of registryEntries) {
    const anchor = await readProjectAnchor(registryEntry.projectRoot);
    if (anchor === null) {
      skipped.push({
        projectRoot: registryEntry.projectRoot,
        reason: 'missing .manta/project.json (folder moved or deleted?)',
      });
      continue;
    }

    projectRows.push({
      project_id: anchor.projectId,
      name: registryEntry.name,
      last_seen_path: registryEntry.projectRoot,
      task_dir: anchor.taskDir,
      indexed_at: indexedAt,
    });

    const tasksRootPath = await resolveTasksRootPath(registryEntry.projectRoot);
    const taskEntries = await listTasks(tasksRootPath);

    for (const taskEntry of taskEntries) {
      let fileContent: string;
      try {
        fileContent = await fs.readFile(taskEntry.filePath, 'utf-8');
      } catch {
        continue;
      }

      const parseResult = parseTaskFileContent(fileContent);
      taskRows.push({
        project_id: anchor.projectId,
        id: taskEntry.id,
        title: taskEntry.title,
        status: taskEntry.status,
        created: taskEntry.created,
        path: taskEntry.filePath,
        hash: hashFileContent(fileContent),
        // 검색용 본문. frontmatter가 깨진 파일은 원문 전체를 그대로 둔다.
        body_text: parseResult.ok ? parseResult.body : fileContent,
      });
    }
  }

  const database = openRootDatabase(databasePath);
  try {
    const insertProject = database.prepare(
      `INSERT INTO projects (project_id, name, last_seen_path, task_dir, indexed_at)
       VALUES (@project_id, @name, @last_seen_path, @task_dir, @indexed_at)`,
    );
    const insertTask = database.prepare(
      `INSERT INTO tasks (project_id, id, title, status, created, path, hash, body_text)
       VALUES (@project_id, @id, @title, @status, @created, @path, @hash, @body_text)`,
    );

    database.transaction(() => {
      database.prepare('DELETE FROM tasks').run();
      database.prepare('DELETE FROM projects').run();
      for (const projectRow of projectRows) {
        insertProject.run(projectRow);
      }
      for (const taskRow of taskRows) {
        insertTask.run(taskRow);
      }
    })();
  } finally {
    database.close();
  }

  return {
    databasePath,
    projectCount: projectRows.length,
    taskCount: taskRows.length,
    skipped,
  };
}
