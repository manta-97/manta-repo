import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { TASK_STATUSES } from './constants';
import { serializeTaskFileContent } from './task-files';
import {
  allocateNextTaskId,
  createTask,
  findTaskRef,
  isValidTaskId,
  listTaskRefs,
  listTasks,
  moveTask,
  readTask,
  searchTasks,
} from './task-repository';

describe('isValidTaskId', () => {
  it('should accept task-<number> ids', () => {
    expect(isValidTaskId('task-1')).toBe(true);
    expect(isValidTaskId('task-42')).toBe(true);
  });

  it('should reject malformed ids', () => {
    expect(isValidTaskId('task-abc')).toBe(false);
    expect(isValidTaskId('3')).toBe(false);
    expect(isValidTaskId('task-')).toBe(false);
    expect(isValidTaskId('TASK-3')).toBe(false);
  });
});

describe('task repository', () => {
  let tmpDir: string;
  let tasksRootPath: string;

  async function writeTaskFile(
    status: (typeof TASK_STATUSES)[number],
    id: string,
    title: string,
    body = '',
  ): Promise<string> {
    const filePath = path.join(tasksRootPath, status, `${id}.md`);
    await fs.writeFile(
      filePath,
      serializeTaskFileContent({ id, title, created: '2026-06-10' }, body),
    );
    return filePath;
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
    tasksRootPath = path.join(tmpDir, 'manta', 'tasks');
    for (const status of TASK_STATUSES) {
      await fs.mkdir(path.join(tasksRootPath, status), { recursive: true });
    }
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('allocateNextTaskId', () => {
    it('should return task-1 for an empty project', async () => {
      expect(await allocateNextTaskId(tasksRootPath)).toBe('task-1');
    });

    it('should scan all three status folders for the max number', async () => {
      await writeTaskFile('todo', 'task-1', 'a');
      await writeTaskFile('done', 'task-7', 'b');
      await writeTaskFile('in-progress', 'task-3', 'c');

      expect(await allocateNextTaskId(tasksRootPath)).toBe('task-8');
    });

    it('should not reuse gaps left by deleted tasks', async () => {
      await writeTaskFile('done', 'task-5', 'only the last one remains');

      expect(await allocateNextTaskId(tasksRootPath)).toBe('task-6');
    });
  });

  describe('createTask', () => {
    it('should create a task file in todo/ with frontmatter', async () => {
      const result = await createTask(tasksRootPath, 'Build the CLI', '2026-06-10');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.task.id).toBe('task-1');
        expect(result.task.status).toBe('todo');

        const fileContent = await fs.readFile(result.task.filePath, 'utf-8');
        expect(fileContent).toBe(
          ['---', 'id: task-1', 'title: Build the CLI', 'created: 2026-06-10', '---', ''].join(
            '\n',
          ),
        );
      }
    });

    it('should allocate sequential ids across statuses', async () => {
      await writeTaskFile('done', 'task-2', 'existing');

      const result = await createTask(tasksRootPath, 'next task', '2026-06-10');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.task.id).toBe('task-3');
      }
    });
  });

  describe('findTaskRef', () => {
    it('should return INVALID_TASK_ID for malformed ids', async () => {
      const result = await findTaskRef(tasksRootPath, 'task-abc');

      expect(result).toMatchObject({ ok: false, error: 'INVALID_TASK_ID' });
    });

    it('should return TASK_NOT_FOUND when no folder has the task', async () => {
      const result = await findTaskRef(tasksRootPath, 'task-99');

      expect(result).toMatchObject({ ok: false, error: 'TASK_NOT_FOUND' });
    });

    it('should return DUPLICATE_TASK_ID when two folders have the same id', async () => {
      await writeTaskFile('todo', 'task-1', 'a');
      await writeTaskFile('done', 'task-1', 'a-copy');

      const result = await findTaskRef(tasksRootPath, 'task-1');

      expect(result).toMatchObject({ ok: false, error: 'DUPLICATE_TASK_ID' });
    });

    it('should locate the task regardless of its status folder', async () => {
      const filePath = await writeTaskFile('in-progress', 'task-4', 'wip');

      const result = await findTaskRef(tasksRootPath, 'task-4');

      expect(result).toEqual({ ok: true, ref: { id: 'task-4', status: 'in-progress', filePath } });
    });
  });

  describe('readTask', () => {
    it('should return the full task with body', async () => {
      await writeTaskFile('todo', 'task-1', 'with body', 'Line one.\nLine two.\n');

      const result = await readTask(tasksRootPath, 'task-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.task.title).toBe('with body');
        expect(result.task.created).toBe('2026-06-10');
        expect(result.task.body).toBe('Line one.\nLine two.\n');
      }
    });

    it('should return TASK_FILE_MALFORMED for files without frontmatter', async () => {
      await fs.writeFile(path.join(tasksRootPath, 'todo', 'task-1.md'), 'no frontmatter here');

      const result = await readTask(tasksRootPath, 'task-1');

      expect(result).toMatchObject({ ok: false, error: 'TASK_FILE_MALFORMED' });
    });
  });

  describe('listTaskRefs / listTasks', () => {
    it('should list tasks across all statuses sorted by id number', async () => {
      await writeTaskFile('done', 'task-10', 'ten');
      await writeTaskFile('todo', 'task-2', 'two');
      await writeTaskFile('in-progress', 'task-1', 'one');

      const refs = await listTaskRefs(tasksRootPath);

      expect(refs.map((ref) => ref.id)).toEqual(['task-1', 'task-2', 'task-10']);
    });

    it('should ignore non-task files like .gitkeep', async () => {
      await fs.writeFile(path.join(tasksRootPath, 'todo', '.gitkeep'), '');
      await writeTaskFile('todo', 'task-1', 'a');

      const refs = await listTaskRefs(tasksRootPath);

      expect(refs).toHaveLength(1);
    });

    it('should keep malformed files in the list with a malformed flag', async () => {
      await writeTaskFile('todo', 'task-1', 'good');
      await fs.writeFile(path.join(tasksRootPath, 'todo', 'task-2.md'), 'broken');

      const entries = await listTasks(tasksRootPath);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({ id: 'task-1', title: 'good', malformed: false });
      expect(entries[1]).toMatchObject({ id: 'task-2', title: null, malformed: true });
    });
  });

  describe('moveTask', () => {
    it('should move the file between status folders', async () => {
      await writeTaskFile('todo', 'task-1', 'a');

      const result = await moveTask(tasksRootPath, 'task-1', 'in-progress');

      expect(result).toMatchObject({ ok: true, from: 'todo', to: 'in-progress', moved: true });
      const movedStat = await fs.stat(path.join(tasksRootPath, 'in-progress', 'task-1.md'));
      expect(movedStat.isFile()).toBe(true);
      await expect(fs.stat(path.join(tasksRootPath, 'todo', 'task-1.md'))).rejects.toThrow();
    });

    it('should be a no-op when the task is already in the target status', async () => {
      const filePath = await writeTaskFile('done', 'task-1', 'a');

      const result = await moveTask(tasksRootPath, 'task-1', 'done');

      expect(result).toEqual({
        ok: true,
        id: 'task-1',
        from: 'done',
        to: 'done',
        moved: false,
        filePath,
      });
    });

    it('should allow moving backwards from done to in-progress', async () => {
      await writeTaskFile('done', 'task-1', 'reopen me');

      const result = await moveTask(tasksRootPath, 'task-1', 'in-progress');

      expect(result).toMatchObject({ ok: true, from: 'done', to: 'in-progress', moved: true });
    });

    it('should return TASK_NOT_FOUND for missing tasks', async () => {
      const result = await moveTask(tasksRootPath, 'task-9', 'done');

      expect(result).toMatchObject({ ok: false, error: 'TASK_NOT_FOUND' });
    });
  });

  describe('searchTasks', () => {
    it('should match titles case-insensitively without a snippet', async () => {
      await writeTaskFile('todo', 'task-1', 'Fix OAuth login');

      const matches = await searchTasks(tasksRootPath, 'oauth');

      expect(matches).toEqual([
        { id: 'task-1', status: 'todo', title: 'Fix OAuth login', snippet: null },
      ]);
    });

    it('should match body text and return the first matching line as snippet', async () => {
      await writeTaskFile('done', 'task-2', 'unrelated title', 'first line\nthe migration plan\n');

      const matches = await searchTasks(tasksRootPath, 'migration');

      expect(matches).toEqual([
        { id: 'task-2', status: 'done', title: 'unrelated title', snippet: 'the migration plan' },
      ]);
    });

    it('should filter by status when statusFilter is given', async () => {
      await writeTaskFile('todo', 'task-1', 'auth in todo');
      await writeTaskFile('done', 'task-2', 'auth in done');

      const matches = await searchTasks(tasksRootPath, 'auth', 'done');

      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('task-2');
    });

    it('should return an empty array when nothing matches', async () => {
      await writeTaskFile('todo', 'task-1', 'something');

      const matches = await searchTasks(tasksRootPath, 'nomatch');

      expect(matches).toEqual([]);
    });
  });
});
