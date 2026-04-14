export const VERSION = '0.1.0';

export { resolveTaskDirPath, initializeMantaProject } from './init';
export { findMantaRoot } from './find-manta-root';
export { getMantaDataDir } from './global-paths';
export { readProjectRegistry, registerProject } from './project-registry';
export type { InitResult, ProjectEntry } from './types';
