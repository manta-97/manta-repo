import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { InitResult } from './types';
import { registerProject } from './project-registry';
import { MANTA_MARKER_DIR, TASKS_DIR, DEFAULT_TASK_DIR_NAME } from './constants';

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
      return {
        ok: false,
        error: 'ALREADY_INITIALIZED',
        message: `Already initialized at ${projectRoot}`,
      };
    }

    if (markerExists !== null && !markerExists.isDirectory()) {
      return {
        ok: false,
        error: 'PATH_IS_FILE',
        message: `Path already exists and is not a directory: ${markerDir}`,
      };
    }

    const taskDirStat = await fs.stat(taskDirPath).catch(() => null);
    if (taskDirStat !== null && !taskDirStat.isDirectory()) {
      return {
        ok: false,
        error: 'PATH_IS_FILE',
        message: `Path already exists and is not a directory: ${taskDirPath}`,
      };
    }

    await fs.mkdir(markerDir, { recursive: true });

    const tasksPath = path.join(taskDirPath, TASKS_DIR);
    await fs.mkdir(tasksPath, { recursive: true });

    await registerProject(globalDataDir, {
      name: path.basename(projectRoot),
      projectRoot,
      taskDirName: path.basename(taskDirPath),
      // toISOString() → '2026-04-11T12:34:56.789Z', slice(0,10) → '2026-04-11'
      registeredAt: new Date().toISOString().slice(0, 10),
    });

    return { ok: true, projectRoot, taskDirPath, created: true };
  } catch (error) {
    // EACCES — 디렉토리 생성 권한이 없는 경우.
    if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
      return {
        ok: false,
        error: 'PERMISSION_DENIED',
        message: `Permission denied: ${projectRoot}`,
      };
    }
    return {
      ok: false,
      error: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
