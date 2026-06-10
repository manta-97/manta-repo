import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { ProjectAnchor } from './types';
import {
  MANTA_MARKER_DIR,
  PROJECT_ANCHOR_FILE,
  PROJECT_ANCHOR_SCHEMA_VERSION,
  DEFAULT_TASK_DIR_NAME,
  TASKS_DIR,
} from './constants';

export function generateProjectId(): string {
  return `manta_proj_${crypto.randomBytes(6).toString('hex')}`;
}

export function createProjectAnchor(taskDir: string, createdAt: string): ProjectAnchor {
  return {
    projectId: generateProjectId(),
    schemaVersion: PROJECT_ANCHOR_SCHEMA_VERSION,
    createdAt,
    taskDir,
  };
}

function projectAnchorPath(projectRoot: string): string {
  return path.join(projectRoot, MANTA_MARKER_DIR, PROJECT_ANCHOR_FILE);
}

export async function writeProjectAnchor(
  projectRoot: string,
  anchor: ProjectAnchor,
): Promise<void> {
  await fs.writeFile(projectAnchorPath(projectRoot), JSON.stringify(anchor, null, 2) + '\n');
}

/**
 * `.manta/project.json`을 읽는다. 파일이 없거나 JSON이 깨졌으면 `null`을 반환해서
 * 호출자가 기본값으로 계속 동작할 수 있게 한다 — anchor 손상이 작업 파일 접근을
 * 막아서는 안 된다 (파일이 source of truth, anchor는 연결점일 뿐이다).
 */
export async function readProjectAnchor(projectRoot: string): Promise<ProjectAnchor | null> {
  try {
    const content = await fs.readFile(projectAnchorPath(projectRoot), 'utf-8');
    return JSON.parse(content) as ProjectAnchor;
  } catch {
    return null;
  }
}

/**
 * 프로젝트 루트에서 task 파일들이 사는 `<taskDir>/tasks` 절대 경로를 구한다.
 * anchor가 없으면 기본 task 디렉토리(`manta/`)로 동작한다.
 */
export async function resolveTasksRootPath(projectRoot: string): Promise<string> {
  const anchor = await readProjectAnchor(projectRoot);
  const taskDir = anchor?.taskDir ?? DEFAULT_TASK_DIR_NAME;
  return path.join(projectRoot, taskDir, TASKS_DIR);
}
