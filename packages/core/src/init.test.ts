import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { resolveTaskDirPath, initializeMantaProject } from './init';
import { readProjectRegistry } from './project-registry';
import { readProjectAnchor } from './project-anchor';
import { TASK_STATUSES } from './constants';

describe('resolveTaskDirPath', () => {
  it('should return manta/ under cwd when no input path given', () => {
    const result = resolveTaskDirPath(undefined, '/home/user/project');
    expect(result).toBe(path.resolve('/home/user/project', 'manta'));
  });

  it('should resolve relative input path against cwd', () => {
    const result = resolveTaskDirPath('my-tasks', '/home/user/project');
    expect(result).toBe(path.resolve('/home/user/project', 'my-tasks'));
  });

  it('should return absolute input path as-is', () => {
    const result = resolveTaskDirPath('/tmp/my-manta', '/home/user/project');
    expect(result).toBe('/tmp/my-manta');
  });
});

describe('initializeMantaProject', () => {
  let tmpDir: string;
  let projectRoot: string;
  let globalDataDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
    projectRoot = path.join(tmpDir, 'my-project');
    globalDataDir = path.join(tmpDir, 'global-data');
    await fs.mkdir(projectRoot);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should create .manta/ marker dir and the three status folders', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const markerStat = await fs.stat(path.join(projectRoot, '.manta'));
    expect(markerStat.isDirectory()).toBe(true);

    for (const status of TASK_STATUSES) {
      const statusDirStat = await fs.stat(path.join(taskDirPath, 'tasks', status));
      expect(statusDirStat.isDirectory()).toBe(true);
    }
  });

  it('should create an empty .gitkeep in each status folder', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    for (const status of TASK_STATUSES) {
      const gitkeepStat = await fs.stat(path.join(taskDirPath, 'tasks', status, '.gitkeep'));
      expect(gitkeepStat.isFile()).toBe(true);
      expect(gitkeepStat.size).toBe(0);
    }
  });

  it('should write project anchor with projectId and relative taskDir', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const anchor = await readProjectAnchor(projectRoot);
    expect(anchor).not.toBeNull();
    expect(anchor!.projectId).toMatch(/^manta_proj_[0-9a-f]{12}$/);
    expect(anchor!.schemaVersion).toBe(1);
    expect(anchor!.taskDir).toBe('manta');
    expect(anchor!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should register project with the anchor projectId in global projects.json', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const anchor = await readProjectAnchor(projectRoot);
    const projects = await readProjectRegistry(globalDataDir);
    expect(projects).toHaveLength(1);
    expect(projects[0].projectId).toBe(anchor!.projectId);
    expect(projects[0].projectRoot).toBe(projectRoot);
    expect(projects[0].taskDirName).toBe('manta');
    expect(projects[0].name).toBe('my-project');
  });

  it('should return ok with projectId and created:true when project is new', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    expect(result).toEqual({
      ok: true,
      projectRoot,
      taskDirPath,
      projectId: expect.stringMatching(/^manta_proj_/),
      created: true,
    });
  });

  it('should return ALREADY_INITIALIZED when .manta/ already exists', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);
    const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    expect(result).toEqual({
      ok: false,
      error: 'ALREADY_INITIALIZED',
      message: `Already initialized at ${projectRoot}`,
    });
  });

  it('should return PATH_IS_FILE when .manta path is an existing file', async () => {
    const markerPath = path.join(projectRoot, '.manta');
    await fs.writeFile(markerPath, 'not a directory');
    const taskDirPath = path.join(projectRoot, 'manta');
    const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    expect(result).toEqual({
      ok: false,
      error: 'PATH_IS_FILE',
      message: `Path already exists and is not a directory: ${markerPath}`,
    });
  });

  it('should return PATH_IS_FILE when task dir path is an existing file', async () => {
    const filePath = path.join(projectRoot, 'manta');
    await fs.writeFile(filePath, 'hello');
    const result = await initializeMantaProject(projectRoot, filePath, globalDataDir);

    expect(result).toEqual({
      ok: false,
      error: 'PATH_IS_FILE',
      message: `Path already exists and is not a directory: ${filePath}`,
    });
  });

  it('should not overwrite an existing .gitkeep with content', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    const todoDir = path.join(taskDirPath, 'tasks', 'todo');
    await fs.mkdir(todoDir, { recursive: true });
    const gitkeepPath = path.join(todoDir, '.gitkeep');
    await fs.writeFile(gitkeepPath, 'user content');

    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const gitkeepContent = await fs.readFile(gitkeepPath, 'utf-8');
    expect(gitkeepContent).toBe('user content');
  });

  it('should work with custom task dir name', async () => {
    const taskDirPath = path.join(projectRoot, 'my-tasks');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const tasksStat = await fs.stat(path.join(taskDirPath, 'tasks'));
    expect(tasksStat.isDirectory()).toBe(true);

    const anchor = await readProjectAnchor(projectRoot);
    expect(anchor!.taskDir).toBe('my-tasks');

    const projects = await readProjectRegistry(globalDataDir);
    expect(projects[0].taskDirName).toBe('my-tasks');
  });
});
