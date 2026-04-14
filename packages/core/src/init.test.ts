import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { resolveTaskDirPath, getTaskDirName, initializeMantaProject } from './init';
import { readProjectRegistry } from './project-registry';

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

describe('getTaskDirName', () => {
  it('should return the last segment of the path', () => {
    expect(getTaskDirName('/home/user/project/my-tasks')).toBe('my-tasks');
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

  it('should create .manta/ marker dir and manta/tasks/ dir', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const markerStat = await fs.stat(path.join(projectRoot, '.manta'));
    expect(markerStat.isDirectory()).toBe(true);

    const tasksStat = await fs.stat(path.join(taskDirPath, 'tasks'));
    expect(tasksStat.isDirectory()).toBe(true);
  });

  it('should register project in global projects.json', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const projects = await readProjectRegistry(globalDataDir);
    expect(projects).toHaveLength(1);
    expect(projects[0].projectRoot).toBe(projectRoot);
    expect(projects[0].taskDirName).toBe('manta');
    expect(projects[0].name).toBe('my-project');
  });

  it('should return ok with created:true when project is new', async () => {
    const taskDirPath = path.join(projectRoot, 'manta');
    const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    expect(result).toEqual({
      ok: true,
      projectRoot,
      taskDirPath,
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

  it('should work with custom task dir name', async () => {
    const taskDirPath = path.join(projectRoot, 'my-tasks');
    await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    const tasksStat = await fs.stat(path.join(taskDirPath, 'tasks'));
    expect(tasksStat.isDirectory()).toBe(true);

    const projects = await readProjectRegistry(globalDataDir);
    expect(projects[0].taskDirName).toBe('my-tasks');
  });
});
