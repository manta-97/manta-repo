import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import Database from 'better-sqlite3';
import {
  createTask,
  initializeMantaProject,
  registerProject,
  readProjectAnchor,
} from '@manta/core';
import { rebuildIndex } from './rebuild-index';
import { checkIndex } from './check-index';
import { getRootDatabasePath } from './root-database';

describe('root SQLite index engine', () => {
  let tmpDir: string;
  let globalDataDir: string;
  let projectRoot: string;
  let tasksRootPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-engine-test-'));
    globalDataDir = path.join(tmpDir, 'manta-home');
    projectRoot = path.join(tmpDir, 'my-project');
    await fs.mkdir(projectRoot);

    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);
    tasksRootPath = path.join(taskDirPath, 'tasks');

    await createTask(tasksRootPath, 'first task', '2026-06-10');
    await createTask(tasksRootPath, 'second task', '2026-06-10');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('rebuildIndex', () => {
    it('should index registered projects and their tasks', async () => {
      const result = await rebuildIndex(globalDataDir);

      expect(result.projectCount).toBe(1);
      expect(result.taskCount).toBe(2);
      expect(result.skipped).toEqual([]);
      expect(result.databasePath).toBe(getRootDatabasePath(globalDataDir));

      const database = new Database(result.databasePath, { readonly: true });
      const taskRows = database.prepare('SELECT id, title, status FROM tasks ORDER BY id').all();
      database.close();

      expect(taskRows).toEqual([
        { id: 'task-1', title: 'first task', status: 'todo' },
        { id: 'task-2', title: 'second task', status: 'todo' },
      ]);
    });

    it('should fully replace previous index contents on rebuild', async () => {
      await rebuildIndex(globalDataDir);
      await createTask(tasksRootPath, 'third task', '2026-06-11');

      const result = await rebuildIndex(globalDataDir);

      expect(result.taskCount).toBe(3);
    });

    it('should skip registry entries whose anchor is gone', async () => {
      await fs.rm(path.join(projectRoot, '.manta'), { recursive: true });

      const result = await rebuildIndex(globalDataDir);

      expect(result.projectCount).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].projectRoot).toBe(projectRoot);
    });

    it('should relink a moved project by projectId after re-registration', async () => {
      await rebuildIndex(globalDataDir);

      const movedRoot = path.join(tmpDir, 'moved-project');
      await fs.rename(projectRoot, movedRoot);
      const anchor = await readProjectAnchor(movedRoot);
      await registerProject(globalDataDir, {
        projectId: anchor!.projectId,
        name: 'moved-project',
        projectRoot: movedRoot,
        taskDirName: 'manta',
        registeredAt: '2026-06-11',
      });

      const result = await rebuildIndex(globalDataDir);

      expect(result.projectCount).toBe(1);
      const database = new Database(result.databasePath, { readonly: true });
      const projectRow = database
        .prepare('SELECT project_id, last_seen_path FROM projects')
        .get() as { project_id: string; last_seen_path: string };
      database.close();

      expect(projectRow.project_id).toBe(anchor!.projectId);
      expect(projectRow.last_seen_path).toBe(movedRoot);
    });
  });

  describe('checkIndex', () => {
    it('should report database-missing before the first rebuild', async () => {
      const result = await checkIndex(globalDataDir);

      expect(result.ok).toBe(false);
      expect(result.issues[0].type).toBe('database-missing');
    });

    it('should pass right after a rebuild', async () => {
      await rebuildIndex(globalDataDir);

      const result = await checkIndex(globalDataDir);

      expect(result.ok).toBe(true);
      expect(result.projectCount).toBe(1);
      expect(result.taskCount).toBe(2);
    });

    it('should detect tasks added after the last rebuild', async () => {
      await rebuildIndex(globalDataDir);
      await createTask(tasksRootPath, 'added later', '2026-06-11');

      const result = await checkIndex(globalDataDir);

      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.type)).toContain('task-not-indexed');
    });

    it('should detect deleted task files', async () => {
      await rebuildIndex(globalDataDir);
      await fs.rm(path.join(tasksRootPath, 'todo', 'task-1.md'));

      const result = await checkIndex(globalDataDir);

      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.type)).toContain('task-file-missing');
    });

    it('should detect changed task files via hash mismatch', async () => {
      await rebuildIndex(globalDataDir);
      const taskFilePath = path.join(tasksRootPath, 'todo', 'task-1.md');
      await fs.appendFile(taskFilePath, '\nedited after indexing\n');

      const result = await checkIndex(globalDataDir);

      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.type)).toContain('task-file-changed');
    });
  });
});
