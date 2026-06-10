export const MANTA_MARKER_DIR = '.manta';
export const PROJECT_ANCHOR_FILE = 'project.json';
export const PROJECT_ANCHOR_SCHEMA_VERSION = 1;
export const TASKS_DIR = 'tasks';
export const DEFAULT_TASK_DIR_NAME = 'manta';
export const ROOT_DATABASE_FILE = 'manta.sqlite';

/**
 * 작업 상태는 frontmatter가 아니라 폴더 위치가 결정한다.
 * `tasks/{todo,in-progress,done}/` 세 폴더가 상태 모델의 전부다.
 */
export const TASK_STATUSES = ['todo', 'in-progress', 'done'] as const;
