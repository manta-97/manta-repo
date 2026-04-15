import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { ProjectEntry } from './types';

const PROJECTS_FILE = 'projects.json';

/**
 * `projects.json`을 읽어서 `ProjectEntry` 배열로 반환한다.
 * 파일이 없으면 빈 배열 — "아직 등록된 프로젝트 없음"으로 취급.
 *
 * @param globalDataDir - 전역 데이터 디렉토리 경로 (`~/Library/Application Support/manta`)
 * @returns 등록된 프로젝트 목록. 파일이 없으면 빈 배열.
 *
 * @remarks
 * `as ProjectEntry[]` — 타입 단언. 런타임 검증은 안 한다.
 * 내부에서 우리가 쓴 파일을 읽는 거라 신뢰. 외부 입력이면 zod 등으로 검증 필요.
 */
export async function readProjectRegistry(globalDataDir: string): Promise<ProjectEntry[]> {
  const filePath = path.join(globalDataDir, PROJECTS_FILE);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as ProjectEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 프로젝트를 `projects.json`에 등록한다. upsert 패턴을 사용:
 * - `projectRoot`가 같으면 기존 엔트리를 덮어쓴다.
 * - 없으면 새로 추가한다.
 *
 * @param globalDataDir - 전역 데이터 디렉토리 경로
 * @param entry - 등록할 프로젝트 정보
 *
 * @remarks
 * `globalDataDir`이 없으면 `recursive: true`로 중간 경로까지 전부 만든다.
 */
export async function registerProject(globalDataDir: string, entry: ProjectEntry): Promise<void> {
  const projects = await readProjectRegistry(globalDataDir);
  const existingIndex = projects.findIndex((p) => p.projectRoot === entry.projectRoot);

  if (existingIndex >= 0) {
    projects[existingIndex] = entry;
  } else {
    projects.push(entry);
  }

  await fs.mkdir(globalDataDir, { recursive: true });
  const filePath = path.join(globalDataDir, PROJECTS_FILE);
  await fs.writeFile(filePath, JSON.stringify(projects, null, 2) + '\n');
}
