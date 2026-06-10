export const VERSION = '0.1.0';

export { resolveTaskDirPath, initializeMantaProject } from './init';
export { findMantaRoot } from './find-manta-root';
export { getMantaHomeDir } from './global-paths';
export { readProjectRegistry, registerProject } from './project-registry';
export {
  generateProjectId,
  createProjectAnchor,
  writeProjectAnchor,
  readProjectAnchor,
  resolveTasksRootPath,
} from './project-anchor';
export { parseTaskFileContent, serializeTaskFileContent } from './task-files';
export type { TaskFileFrontmatter, ParseTaskFileResult } from './task-files';
export {
  isValidTaskId,
  listTaskRefs,
  allocateNextTaskId,
  createTask,
  findTaskRef,
  readTask,
  listTasks,
  moveTask,
  searchTasks,
} from './task-repository';
export {
  TASK_STATUSES,
  MANTA_MARKER_DIR,
  PROJECT_ANCHOR_FILE,
  TASKS_DIR,
  DEFAULT_TASK_DIR_NAME,
  ROOT_DATABASE_FILE,
} from './constants';
export type {
  InitResult,
  ProjectEntry,
  ProjectAnchor,
  TaskStatus,
  TaskRef,
  Task,
  TaskListEntry,
  TaskSearchMatch,
  MantaFailure,
  TaskRefResult,
  TaskReadResult,
  TaskCreateResult,
  TaskMoveResult,
} from './types';
export { MantaErrors } from './errors';
export type { MantaErrorCode } from './errors';
