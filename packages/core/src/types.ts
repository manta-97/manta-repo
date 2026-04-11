export type InitResult =
  | { ok: true; projectRoot: string; taskDirPath: string; created: boolean }
  | {
      ok: false;
      error: 'PATH_IS_FILE' | 'ALREADY_INITIALIZED' | 'PERMISSION_DENIED' | 'UNKNOWNl';
      message: string;
    };

export interface ProjectEntry {
  name: string;
  projectRoot: string;
  taskDirName: string;
  registeredAt: string; // TODO:7 registeredAt 을 string 일지 date 일지 고민
}
