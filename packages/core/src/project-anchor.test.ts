import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import {
  createProjectAnchor,
  generateProjectId,
  readProjectAnchor,
  resolveTasksRootPath,
  writeProjectAnchor,
} from './project-anchor';

describe('generateProjectId', () => {
  it('should generate ids with the manta_proj_ prefix and hex suffix', () => {
    const projectId = generateProjectId();
    expect(projectId).toMatch(/^manta_proj_[0-9a-f]{12}$/);
  });

  it('should generate unique ids', () => {
    expect(generateProjectId()).not.toBe(generateProjectId());
  });
});

describe('project anchor read/write', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
    projectRoot = path.join(tmpDir, 'my-project');
    await fs.mkdir(path.join(projectRoot, '.manta'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should round-trip an anchor through write and read', async () => {
    const anchor = createProjectAnchor('manta', '2026-06-10');
    await writeProjectAnchor(projectRoot, anchor);

    const readBack = await readProjectAnchor(projectRoot);
    expect(readBack).toEqual(anchor);
  });

  it('should return null when anchor file does not exist', async () => {
    const readBack = await readProjectAnchor(projectRoot);
    expect(readBack).toBeNull();
  });

  it('should return null when anchor file is corrupted', async () => {
    await fs.writeFile(path.join(projectRoot, '.manta', 'project.json'), '{ broken');

    const readBack = await readProjectAnchor(projectRoot);
    expect(readBack).toBeNull();
  });
});

describe('resolveTasksRootPath', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
    projectRoot = path.join(tmpDir, 'my-project');
    await fs.mkdir(path.join(projectRoot, '.manta'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should resolve tasks root from the anchor taskDir', async () => {
    await writeProjectAnchor(projectRoot, createProjectAnchor('docs', '2026-06-10'));

    const tasksRootPath = await resolveTasksRootPath(projectRoot);
    expect(tasksRootPath).toBe(path.join(projectRoot, 'docs', 'tasks'));
  });

  it('should fall back to the default task dir when anchor is missing', async () => {
    const tasksRootPath = await resolveTasksRootPath(projectRoot);
    expect(tasksRootPath).toBe(path.join(projectRoot, 'manta', 'tasks'));
  });
});
