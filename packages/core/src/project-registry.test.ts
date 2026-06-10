import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { ProjectEntry } from './types';
import { readProjectRegistry, registerProject } from './project-registry';

function buildProjectEntry(overrides: Partial<ProjectEntry> = {}): ProjectEntry {
  return {
    projectId: 'manta_proj_abc123',
    name: 'my-app',
    projectRoot: '/Users/test/my-app',
    taskDirName: 'manta',
    registeredAt: '2026-04-11',
    ...overrides,
  };
}

describe('readProjectRegistry', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array when projects.json does not exist', async () => {
    const result = await readProjectRegistry(tmpDir);
    expect(result).toEqual([]);
  });

  it('should throw error when projects.json contains invalid JSON', async () => {
    await fs.writeFile(path.join(tmpDir, 'projects.json'), '{ broken json');

    await expect(readProjectRegistry(tmpDir)).rejects.toThrow(SyntaxError);
  });

  it('should return projects from existing projects.json', async () => {
    const projects: ProjectEntry[] = [buildProjectEntry()];
    await fs.writeFile(path.join(tmpDir, 'projects.json'), JSON.stringify(projects));

    const result = await readProjectRegistry(tmpDir);
    expect(result).toEqual(projects);
  });
});

describe('registerProject', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should create projects.json and add project entry', async () => {
    const entry = buildProjectEntry();
    await registerProject(tmpDir, entry);

    const result = await readProjectRegistry(tmpDir);
    expect(result).toEqual([entry]);
  });

  it('should update existing project when projectRoot matches', async () => {
    await registerProject(tmpDir, buildProjectEntry({ taskDirName: 'manta' }));
    await registerProject(tmpDir, buildProjectEntry({ taskDirName: 'my-tasks' }));

    const result = await readProjectRegistry(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].taskDirName).toBe('my-tasks');
  });

  it('should update existing project by projectId when the folder moved', async () => {
    await registerProject(tmpDir, buildProjectEntry({ projectRoot: '/Users/test/old-location' }));
    await registerProject(tmpDir, buildProjectEntry({ projectRoot: '/Users/test/new-location' }));

    const result = await readProjectRegistry(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].projectRoot).toBe('/Users/test/new-location');
  });

  it('should create globalDataDir if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'nested', 'data');
    const entry = buildProjectEntry();
    await registerProject(nestedDir, entry);

    const result = await readProjectRegistry(nestedDir);
    expect(result).toEqual([entry]);
  });
});
