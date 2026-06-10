import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { TASK_STATUSES } from './constants';
import {
  TaskCreateResult,
  TaskListEntry,
  TaskMoveResult,
  TaskReadResult,
  TaskRef,
  TaskRefResult,
  TaskSearchMatch,
  TaskStatus,
} from './types';
import { MantaErrors } from './errors';
import { parseTaskFileContent, serializeTaskFileContent } from './task-files';

const TASK_FILE_PATTERN = /^task-(\d+)\.md$/;
const TASK_ID_PATTERN = /^task-\d+$/;

export function isValidTaskId(rawId: string): boolean {
  return TASK_ID_PATTERN.test(rawId);
}

function taskIdNumber(taskId: string): number {
  return Number(taskId.slice('task-'.length));
}

function taskFilePath(tasksRootPath: string, status: TaskStatus, taskId: string): string {
  return path.join(tasksRootPath, status, `${taskId}.md`);
}

/**
 * 한 상태 폴더의 task 파일 이름들을 반환한다.
 * 폴더가 없으면 빈 배열 — 목록/검색이 비정상 폴더 하나 때문에 통째로 죽지 않게 한다.
 */
async function listTaskFileNames(tasksRootPath: string, status: TaskStatus): Promise<string[]> {
  try {
    const fileNames = await fs.readdir(path.join(tasksRootPath, status));
    return fileNames.filter((fileName) => TASK_FILE_PATTERN.test(fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 세 상태 폴더 전체를 스캔해 task 파일 위치 목록을 만든다.
 * 정렬은 id 숫자 오름차순 — 파일 시스템의 사전순(task-10 < task-2)을 따르지 않는다.
 */
export async function listTaskRefs(tasksRootPath: string): Promise<TaskRef[]> {
  const refs: TaskRef[] = [];

  for (const status of TASK_STATUSES) {
    const fileNames = await listTaskFileNames(tasksRootPath, status);
    for (const fileName of fileNames) {
      refs.push({
        id: fileName.replace(/\.md$/, ''),
        status,
        filePath: taskFilePath(tasksRootPath, status, fileName.replace(/\.md$/, '')),
      });
    }
  }

  return refs.sort((a, b) => taskIdNumber(a.id) - taskIdNumber(b.id));
}

/**
 * 다음 task id를 채번한다. 세 폴더 전체에서 최대 숫자 + 1.
 * 삭제된 id는 재사용하지 않는다 — 과거 커밋과 외부 링크가 엉뚱한 태스크를
 * 가리키게 되는 것을 막는다.
 */
export async function allocateNextTaskId(tasksRootPath: string): Promise<string> {
  const refs = await listTaskRefs(tasksRootPath);
  const maxNumber = refs.reduce((max, ref) => Math.max(max, taskIdNumber(ref.id)), 0);
  return `task-${maxNumber + 1}`;
}

export async function createTask(
  tasksRootPath: string,
  title: string,
  created: string,
): Promise<TaskCreateResult> {
  try {
    const taskId = await allocateNextTaskId(tasksRootPath);
    const filePath = taskFilePath(tasksRootPath, 'todo', taskId);
    const fileContent = serializeTaskFileContent({ id: taskId, title, created }, '');

    // wx 플래그: 채번 직후 같은 id의 파일이 이미 생겼다면 덮어쓰는 대신 실패한다.
    await fs.writeFile(filePath, fileContent, { flag: 'wx' });

    return {
      ok: true,
      task: { id: taskId, title, created, status: 'todo', body: '', filePath },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      return { ok: false, ...MantaErrors.PERMISSION_DENIED(tasksRootPath) };
    }
    return {
      ok: false,
      error: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * task id로 파일 위치를 찾는다. 조회 실패를 한 가지로 뭉개지 않는다:
 * 형식 오류(INVALID_TASK_ID), 부재(TASK_NOT_FOUND), 여러 폴더에 존재(DUPLICATE_TASK_ID)는
 * AI와 GUI가 다르게 대응해야 하는 서로 다른 신호다.
 */
export async function findTaskRef(tasksRootPath: string, rawId: string): Promise<TaskRefResult> {
  if (!isValidTaskId(rawId)) {
    return { ok: false, ...MantaErrors.INVALID_TASK_ID(rawId) };
  }

  const foundRefs: TaskRef[] = [];
  for (const status of TASK_STATUSES) {
    const filePath = taskFilePath(tasksRootPath, status, rawId);
    const fileStat = await fs.stat(filePath).catch(() => null);
    if (fileStat !== null && fileStat.isFile()) {
      foundRefs.push({ id: rawId, status, filePath });
    }
  }

  if (foundRefs.length === 0) {
    return { ok: false, ...MantaErrors.TASK_NOT_FOUND(rawId) };
  }
  if (foundRefs.length > 1) {
    return {
      ok: false,
      ...MantaErrors.DUPLICATE_TASK_ID(
        rawId,
        foundRefs.map((ref) => ref.filePath),
      ),
    };
  }

  return { ok: true, ref: foundRefs[0] };
}

export async function readTask(tasksRootPath: string, rawId: string): Promise<TaskReadResult> {
  const refResult = await findTaskRef(tasksRootPath, rawId);
  if (!refResult.ok) {
    return refResult;
  }
  const { ref } = refResult;

  let fileContent: string;
  try {
    fileContent = await fs.readFile(ref.filePath, 'utf-8');
  } catch {
    return { ok: false, ...MantaErrors.TASK_FILE_UNREADABLE(ref.filePath) };
  }

  const parseResult = parseTaskFileContent(fileContent);
  if (!parseResult.ok) {
    return { ok: false, ...MantaErrors.TASK_FILE_MALFORMED(ref.filePath, parseResult.reason) };
  }

  // 파일명이 조회 기준이므로 id는 ref를 따른다.
  // frontmatter의 id는 파일명이 잘못 바뀌었을 때를 위한 복구 단서다.
  return {
    ok: true,
    task: {
      id: ref.id,
      status: ref.status,
      filePath: ref.filePath,
      title: parseResult.frontmatter.title,
      created: parseResult.frontmatter.created,
      body: parseResult.body,
    },
  };
}

export async function listTasks(tasksRootPath: string): Promise<TaskListEntry[]> {
  const refs = await listTaskRefs(tasksRootPath);

  const entries: TaskListEntry[] = [];
  for (const ref of refs) {
    let parsedTitle: string | null = null;
    let parsedCreated: string | null = null;
    let malformed = true;

    try {
      const fileContent = await fs.readFile(ref.filePath, 'utf-8');
      const parseResult = parseTaskFileContent(fileContent);
      if (parseResult.ok) {
        parsedTitle = parseResult.frontmatter.title;
        parsedCreated = parseResult.frontmatter.created;
        malformed = false;
      }
    } catch {
      // 읽기 실패도 malformed로 표시하고 목록에는 남긴다.
    }

    entries.push({ ...ref, title: parsedTitle, created: parsedCreated, malformed });
  }

  return entries;
}

/**
 * 상태 전환은 파일 이동이 전부다 (느슨 + 최소 가드):
 * - 존재하지 않으면 실패
 * - 이미 목표 상태면 no-op (`moved: false`)
 * - 그 외 전환은 방향에 관계없이 허용 — done에 있는 task도 start로 되돌릴 수 있다
 */
export async function moveTask(
  tasksRootPath: string,
  rawId: string,
  targetStatus: TaskStatus,
): Promise<TaskMoveResult> {
  const refResult = await findTaskRef(tasksRootPath, rawId);
  if (!refResult.ok) {
    return refResult;
  }
  const { ref } = refResult;

  if (ref.status === targetStatus) {
    return {
      ok: true,
      id: ref.id,
      from: ref.status,
      to: targetStatus,
      moved: false,
      filePath: ref.filePath,
    };
  }

  const targetFilePath = taskFilePath(tasksRootPath, targetStatus, ref.id);
  try {
    await fs.rename(ref.filePath, targetFilePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      return { ok: false, ...MantaErrors.PERMISSION_DENIED(tasksRootPath) };
    }
    return {
      ok: false,
      error: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    ok: true,
    id: ref.id,
    from: ref.status,
    to: targetStatus,
    moved: true,
    filePath: targetFilePath,
  };
}

/**
 * task 본문을 교체한다 (frontmatter는 보존). GUI의 명시적 save가 이 함수를 쓴다.
 * 쓰기 전에 기존 파일을 엄격하게 읽으므로(frontmatter 검증 포함),
 * 깨진 파일을 모르고 덮어쓰는 일이 없다.
 */
export async function updateTaskBody(
  tasksRootPath: string,
  rawId: string,
  newBody: string,
): Promise<TaskReadResult> {
  const readResult = await readTask(tasksRootPath, rawId);
  if (!readResult.ok) {
    return readResult;
  }
  const { task } = readResult;

  const fileContent = serializeTaskFileContent(
    { id: task.id, title: task.title, created: task.created },
    newBody,
  );

  try {
    await fs.writeFile(task.filePath, fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      return { ok: false, ...MantaErrors.PERMISSION_DENIED(task.filePath) };
    }
    return {
      ok: false,
      error: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // 직렬화가 정규화한 본문(개행 등)을 그대로 돌려준다 — 파일과 반환값이 항상 일치.
  const parseResult = parseTaskFileContent(fileContent);
  return {
    ok: true,
    task: { ...task, body: parseResult.ok ? parseResult.body : newBody },
  };
}

/**
 * title과 body를 대상으로 한 단순 텍스트 검색 (대소문자 무시).
 * title 매치는 snippet 없이, body 매치는 처음 매치된 줄을 snippet으로 돌려준다.
 * 깨진 파일은 건너뛴다 — 검색 결과의 신뢰성이 우선이다.
 */
export async function searchTasks(
  tasksRootPath: string,
  query: string,
  statusFilter?: TaskStatus,
): Promise<TaskSearchMatch[]> {
  const normalizedQuery = query.toLowerCase();
  const statusesToSearch = statusFilter ? [statusFilter] : TASK_STATUSES;

  const matches: TaskSearchMatch[] = [];
  for (const status of statusesToSearch) {
    const fileNames = await listTaskFileNames(tasksRootPath, status);
    const sortedFileNames = fileNames.sort(
      (a, b) => taskIdNumber(a.replace(/\.md$/, '')) - taskIdNumber(b.replace(/\.md$/, '')),
    );

    for (const fileName of sortedFileNames) {
      const taskId = fileName.replace(/\.md$/, '');
      const filePath = taskFilePath(tasksRootPath, status, taskId);

      let fileContent: string;
      try {
        fileContent = await fs.readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      const parseResult = parseTaskFileContent(fileContent);
      if (!parseResult.ok) {
        continue;
      }

      const titleMatches = parseResult.frontmatter.title.toLowerCase().includes(normalizedQuery);
      const matchedBodyLine = parseResult.body
        .split('\n')
        .find((line) => line.toLowerCase().includes(normalizedQuery));

      if (titleMatches || matchedBodyLine !== undefined) {
        matches.push({
          id: taskId,
          status,
          title: parseResult.frontmatter.title,
          snippet: titleMatches ? null : (matchedBodyLine?.trim() ?? null),
        });
      }
    }
  }

  return matches.sort((a, b) => taskIdNumber(a.id) - taskIdNumber(b.id));
}
