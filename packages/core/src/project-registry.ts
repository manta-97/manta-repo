import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { ProjectEntry } from './types';

const PROJECTS_FILE = 'projects.json';

export async function readProjectRegistry(dataDir: string): Promise<ProjectEntry[]> {
  const filePath = path.join(dataDir, PROJECTS_FILE);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as ProjectEntry[];
  } catch {
    return [];
  }
}

export async function registerProject(dataDir: string, entry: ProjectEntry): Promise<void> {
  const projects = await readProjectRegistry(dataDir);
  const existingIndex = projects.findIndex((p) => p.projectRoot === entry.projectRoot);

  if (existingIndex >= 0) {
    projects[existingIndex] = entry;
  } else {
    projects.push(entry);
  }

  await fs.mkdir(dataDir, { recursive: true }); // dataDir 없으면 중간 경로까지 직접 만들기
  const filePath = path.join(dataDir, PROJECTS_FILE);
  await fs.writeFile(filePath, JSON.stringify(projects, null, 2) + '\n');
}
