import { MantaErrorCode } from './errors';

export type InitResult =
  | { ok: true; projectRoot: string; taskDirPath: string; created: boolean }
  | { ok: false; error: MantaErrorCode | 'UNKNOWN'; message: string };

export interface ProjectEntry {
  name: string;
  projectRoot: string;
  taskDirName: string;
  registeredAt: string;
}
