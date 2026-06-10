import { findMantaRoot, resolveTasksRootPath, MantaErrors, MantaFailure } from '@manta/core';

export type ProjectContextResult =
  | { ok: true; projectRoot: string; tasksRootPath: string }
  | MantaFailure;

/**
 * task를 다루는 모든 명령의 공통 진입점.
 * cwd에서 위로 올라가며 `.manta/`를 찾고, anchor에서 tasks 루트를 해석한다.
 * 프로젝트가 아니면 NOT_INITIALIZED — 각 명령이 이 분기를 반복하지 않게 한다.
 */
export async function loadProjectContext(cwd: string): Promise<ProjectContextResult> {
  const projectRoot = findMantaRoot(cwd);
  if (projectRoot === null) {
    return { ok: false, ...MantaErrors.NOT_INITIALIZED(cwd) };
  }

  const tasksRootPath = await resolveTasksRootPath(projectRoot);
  return { ok: true, projectRoot, tasksRootPath };
}
