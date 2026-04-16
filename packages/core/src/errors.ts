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
} as const;

export type MantaErrorCode = keyof typeof MantaErrors;
