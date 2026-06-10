export const MantaErrors = {
  PATH_IS_FILE: (path: string) => ({
    error: 'PATH_IS_FILE' as const,
    message: `Path already exists and is not a directory: ${path}`,
  }),
  ALREADY_INITIALIZED: (projectRoot: string) => ({
    error: 'ALREADY_INITIALIZED' as const,
    message: `Already initialized at ${projectRoot}`,
  }),
  PERMISSION_DENIED: (projectRoot: string) => ({
    error: 'PERMISSION_DENIED' as const,
    message: `Permission denied: ${projectRoot}`,
  }),
  NOT_INITIALIZED: (startDir: string) => ({
    error: 'NOT_INITIALIZED' as const,
    message: `Not a Manta project (no .manta/ directory found from ${startDir}). Run \`manta init\` first.`,
  }),
  INVALID_TASK_ID: (rawId: string) => ({
    error: 'INVALID_TASK_ID' as const,
    message: `Invalid task id: ${rawId}. Expected format: task-<number> (e.g. task-3).`,
  }),
  TASK_NOT_FOUND: (taskId: string) => ({
    error: 'TASK_NOT_FOUND' as const,
    message: `Task not found: ${taskId}`,
  }),
  DUPLICATE_TASK_ID: (taskId: string, filePaths: readonly string[]) => ({
    error: 'DUPLICATE_TASK_ID' as const,
    message: `Duplicate task id: ${taskId} exists in multiple status folders: ${filePaths.join(', ')}`,
  }),
  TASK_FILE_UNREADABLE: (filePath: string) => ({
    error: 'TASK_FILE_UNREADABLE' as const,
    message: `Task file unreadable: ${filePath}`,
  }),
  TASK_FILE_MALFORMED: (filePath: string, reason: string) => ({
    error: 'TASK_FILE_MALFORMED' as const,
    message: `Task file malformed: ${filePath} (${reason})`,
  }),
  IMPORT_BUNDLE_INVALID: (reason: string) => ({
    error: 'IMPORT_BUNDLE_INVALID' as const,
    message: `Import bundle invalid: ${reason}`,
  }),
} as const;

export type MantaErrorCode = keyof typeof MantaErrors;
