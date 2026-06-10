import * as path from 'node:path';
import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { getMantaHomeDir, ROOT_DATABASE_FILE } from '@manta/core';

/**
 * root SQLite 스키마.
 *
 * 이 DB는 원본이 아니라 로컬 작업 운영 엔진이다. Markdown task 파일과 project anchor에서
 * 언제든 재생성할 수 있어야 하므로, 복구 불가능한 사용자 데이터는 여기에 두지 않는다.
 */
const ROOT_DATABASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  project_id     TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  last_seen_path TEXT NOT NULL,
  task_dir       TEXT NOT NULL,
  indexed_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  project_id TEXT NOT NULL,
  id         TEXT NOT NULL,
  title      TEXT,
  status     TEXT NOT NULL,
  created    TEXT,
  path       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  body_text  TEXT,
  PRIMARY KEY (project_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
`;

export function getRootDatabasePath(globalDataDir: string = getMantaHomeDir()): string {
  return path.join(globalDataDir, ROOT_DATABASE_FILE);
}

export function openRootDatabase(databasePath: string): Database.Database {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.exec(ROOT_DATABASE_SCHEMA);
  return database;
}
