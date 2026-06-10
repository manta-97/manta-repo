import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { InitResult } from './types';
import { MantaErrors } from './errors';
import { registerProject } from './project-registry';
import { createProjectAnchor, writeProjectAnchor } from './project-anchor';
import { MANTA_MARKER_DIR, TASKS_DIR, DEFAULT_TASK_DIR_NAME, TASK_STATUSES } from './constants';

/**
 * 사용자 입력 경로를 절대 경로로 변환한다.
 *
 * @param inputPath - CLI에서 받은 선택적 경로 인자 (`manta init [path]`의 `[path]`)
 * @param cwd - 현재 작업 디렉토리
 * @returns 절대 경로로 변환된 task 디렉토리 경로
 */
export function resolveTaskDirPath(inputPath: string | undefined, cwd: string): string {
  if (inputPath === undefined) {
    return path.resolve(cwd, DEFAULT_TASK_DIR_NAME);
  }
  return path.resolve(cwd, inputPath);
}

/**
 * anchor에는 프로젝트 루트 기준 상대 경로를 기록한다.
 * 프로젝트 폴더가 통째로 이동해도 anchor가 task 디렉토리를 계속 가리키게 하기 위함이다.
 * 루트 밖의 경로는 상대화할 수 없으므로 절대 경로를 그대로 둔다.
 */
function taskDirForAnchor(projectRoot: string, taskDirPath: string): string {
  const relativePath = path.relative(projectRoot, taskDirPath);
  return relativePath.startsWith('..') ? taskDirPath : relativePath;
}

/**
 * `.gitkeep`은 빈 상태 폴더를 git이 추적하게 만드는 관행적 파일이다.
 * 이미 존재하면 건드리지 않는다 — 사용자가 내용을 채워 썼을 수 있다.
 */
async function createGitkeepIfMissing(dirPath: string): Promise<void> {
  try {
    await fs.writeFile(path.join(dirPath, '.gitkeep'), '', { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function initializeMantaProject(
  projectRoot: string,
  taskDirPath: string,
  globalDataDir: string,
): Promise<InitResult> {
  try {
    const markerDir = path.join(projectRoot, MANTA_MARKER_DIR);
    // stat()으로 존재 여부 확인. 없으면 에러 나는데 catch로 null 처리.
    const markerExists = await fs.stat(markerDir).catch(() => null);

    if (markerExists !== null && markerExists.isDirectory()) {
      return { ok: false, ...MantaErrors.ALREADY_INITIALIZED(projectRoot) };
    }

    if (markerExists !== null && !markerExists.isDirectory()) {
      return { ok: false, ...MantaErrors.PATH_IS_FILE(markerDir) };
    }

    const taskDirStat = await fs.stat(taskDirPath).catch(() => null);
    if (taskDirStat !== null && !taskDirStat.isDirectory()) {
      return { ok: false, ...MantaErrors.PATH_IS_FILE(taskDirPath) };
    }

    await fs.mkdir(markerDir, { recursive: true });

    // toISOString() → '2026-04-11T12:34:56.789Z', slice(0,10) → '2026-04-11'
    const today = new Date().toISOString().slice(0, 10);

    const anchor = createProjectAnchor(taskDirForAnchor(projectRoot, taskDirPath), today);
    await writeProjectAnchor(projectRoot, anchor);

    // 세 상태 폴더를 init 시점에 전부 만든다 (eager).
    // "in-progress/는 init 이후 언제나 존재한다"가 시스템 불변식이 되어,
    // 하류 명령어들이 '폴더 없음 = 초기화 안 됨'의 모호함을 떠안지 않는다.
    const tasksPath = path.join(taskDirPath, TASKS_DIR);
    for (const status of TASK_STATUSES) {
      const statusDirPath = path.join(tasksPath, status);
      await fs.mkdir(statusDirPath, { recursive: true });
      await createGitkeepIfMissing(statusDirPath);
    }

    await registerProject(globalDataDir, {
      projectId: anchor.projectId,
      name: path.basename(projectRoot),
      projectRoot,
      taskDirName: path.basename(taskDirPath),
      registeredAt: today,
    });

    return { ok: true, projectRoot, taskDirPath, projectId: anchor.projectId, created: true };
  } catch (error) {
    // EACCES — 디렉토리 생성 권한이 없는 경우.
    if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
      return { ok: false, ...MantaErrors.PERMISSION_DENIED(projectRoot) };
    }
    return {
      ok: false,
      error: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
