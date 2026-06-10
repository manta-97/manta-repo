import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { TASK_STATUSES } from './constants';
import { initializeMantaProject } from './init';
import { createTask, listTasks, moveTask, readTask } from './task-repository';
import { exportTasks, importTasks, TaskExportBundle } from './export-import';

describe('export / import', () => {
  let tmpDir: string;
  let projectRoot: string;
  let tasksRootPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-export-test-'));
    projectRoot = path.join(tmpDir, 'my-project');
    await fs.mkdir(projectRoot);
    await initializeMantaProject(
      projectRoot,
      path.join(projectRoot, 'manta'),
      path.join(tmpDir, 'manta-home'),
    );
    tasksRootPath = path.join(projectRoot, 'manta', 'tasks');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('exportTasks', () => {
    it('should export all tasks with status and body', async () => {
      await createTask(tasksRootPath, 'first', '2026-06-10');
      await createTask(tasksRootPath, 'second', '2026-06-11');
      await moveTask(tasksRootPath, 'task-2', 'done');

      const { bundle, skipped } = await exportTasks(projectRoot);

      expect(skipped).toEqual([]);
      expect(bundle.format).toBe('manta-tasks');
      expect(bundle.version).toBe(1);
      expect(bundle.projectId).toMatch(/^manta_proj_/);
      expect(bundle.tasks).toEqual([
        { id: 'task-1', title: 'first', created: '2026-06-10', status: 'todo', body: '' },
        { id: 'task-2', title: 'second', created: '2026-06-11', status: 'done', body: '' },
      ]);
    });

    it('should report malformed tasks as skipped instead of failing', async () => {
      await createTask(tasksRootPath, 'good', '2026-06-10');
      await fs.writeFile(path.join(tasksRootPath, 'todo', 'task-2.md'), 'broken file');

      const { bundle, skipped } = await exportTasks(projectRoot);

      expect(bundle.tasks).toHaveLength(1);
      expect(skipped).toHaveLength(1);
      expect(skipped[0].id).toBe('task-2');
    });
  });

  describe('importTasks', () => {
    function buildBundle(overrides: Partial<TaskExportBundle> = {}): TaskExportBundle {
      return {
        format: 'manta-tasks',
        version: 1,
        projectId: 'manta_proj_source',
        tasks: [
          {
            id: 'task-3',
            title: 'imported todo',
            created: '2026-05-01',
            status: 'todo',
            body: 'body A\n',
          },
          { id: 'task-7', title: 'imported done', created: '2026-05-02', status: 'done', body: '' },
        ],
        ...overrides,
      };
    }

    it('should import tasks with fresh sequential ids preserving status and body', async () => {
      await createTask(tasksRootPath, 'existing', '2026-06-10');

      const result = await importTasks(tasksRootPath, buildBundle());

      expect(result).toEqual({
        ok: true,
        imported: [
          { sourceId: 'task-3', newId: 'task-2', status: 'todo' },
          { sourceId: 'task-7', newId: 'task-3', status: 'done' },
        ],
      });

      const importedTodo = await readTask(tasksRootPath, 'task-2');
      expect(importedTodo.ok).toBe(true);
      if (importedTodo.ok) {
        expect(importedTodo.task.title).toBe('imported todo');
        expect(importedTodo.task.created).toBe('2026-05-01');
        expect(importedTodo.task.body).toBe('body A\n');
      }

      const entries = await listTasks(tasksRootPath);
      expect(entries.map((entry) => [entry.id, entry.status])).toEqual([
        ['task-1', 'todo'],
        ['task-2', 'todo'],
        ['task-3', 'done'],
      ]);
    });

    it('should round-trip through export and import', async () => {
      await createTask(tasksRootPath, 'round trip', '2026-06-10');
      const { bundle } = await exportTasks(projectRoot);

      const otherProjectRoot = path.join(tmpDir, 'other-project');
      await fs.mkdir(otherProjectRoot);
      await initializeMantaProject(
        otherProjectRoot,
        path.join(otherProjectRoot, 'manta'),
        path.join(tmpDir, 'manta-home'),
      );
      const otherTasksRoot = path.join(otherProjectRoot, 'manta', 'tasks');

      const result = await importTasks(otherTasksRoot, bundle);

      expect(result.ok).toBe(true);
      const reExported = await exportTasks(otherProjectRoot);
      expect(reExported.bundle.tasks.map((task) => [task.title, task.status, task.body])).toEqual(
        bundle.tasks.map((task) => [task.title, task.status, task.body]),
      );
    });

    it('should reject bundles with an unknown format', async () => {
      const result = await importTasks(tasksRootPath, { format: 'other', version: 1, tasks: [] });

      expect(result).toMatchObject({ ok: false, error: 'IMPORT_BUNDLE_INVALID' });
    });

    it('should reject bundles with an invalid status', async () => {
      const bundle = buildBundle();
      (bundle.tasks[0] as { status: string }).status = 'archived';

      const result = await importTasks(tasksRootPath, bundle);

      expect(result).toMatchObject({ ok: false, error: 'IMPORT_BUNDLE_INVALID' });
      // 유효성 검사는 쓰기 전에 끝난다 — 일부만 import되는 일이 없어야 한다.
      const entries = await listTasks(tasksRootPath);
      expect(entries).toHaveLength(0);
    });

    it('should write imported files into the matching status folders', async () => {
      await importTasks(tasksRootPath, buildBundle());

      for (const status of TASK_STATUSES) {
        const fileNames = await fs.readdir(path.join(tasksRootPath, status));
        if (status === 'todo') {
          expect(fileNames).toContain('task-1.md');
        }
        if (status === 'done') {
          expect(fileNames).toContain('task-2.md');
        }
      }
    });
  });
});
