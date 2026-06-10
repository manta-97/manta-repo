import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  createTask,
  getMantaHomeDir,
  listTasks,
  moveTask,
  readProjectRegistry,
  readTask,
  resolveTasksRootPath,
  MANTA_MARKER_DIR,
  TaskStatus,
} from '@manta/core';
import {
  AddTaskResult,
  ListProjectsResult,
  ListTasksResult,
  MANTA_IPC_CHANNELS,
  MoveTaskResult,
  ProjectSummary,
  ReadTaskResult,
} from './shared/manta-api';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

/** 예외를 IPC 경계 밖으로 던지지 않는다 — renderer는 항상 Result 값을 받는다. */
function failureFromError(error: unknown): { ok: false; error: 'UNKNOWN'; message: string } {
  return {
    ok: false,
    error: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
  };
}

function registerMantaIpcHandlers(): void {
  ipcMain.handle(MANTA_IPC_CHANNELS.listProjects, async (): Promise<ListProjectsResult> => {
    try {
      const registryEntries = await readProjectRegistry(getMantaHomeDir());
      const projects: ProjectSummary[] = await Promise.all(
        registryEntries.map(async (entry) => {
          const markerStat = await fs
            .stat(path.join(entry.projectRoot, MANTA_MARKER_DIR))
            .catch(() => null);
          return { ...entry, available: markerStat !== null && markerStat.isDirectory() };
        }),
      );
      return { ok: true, projects };
    } catch (error) {
      return failureFromError(error);
    }
  });

  ipcMain.handle(
    MANTA_IPC_CHANNELS.listTasks,
    async (_event, projectRoot: string): Promise<ListTasksResult> => {
      try {
        const tasksRootPath = await resolveTasksRootPath(projectRoot);
        return { ok: true, tasks: await listTasks(tasksRootPath) };
      } catch (error) {
        return failureFromError(error);
      }
    },
  );

  ipcMain.handle(
    MANTA_IPC_CHANNELS.readTask,
    async (_event, projectRoot: string, taskId: string): Promise<ReadTaskResult> => {
      try {
        const tasksRootPath = await resolveTasksRootPath(projectRoot);
        return await readTask(tasksRootPath, taskId);
      } catch (error) {
        return failureFromError(error);
      }
    },
  );

  ipcMain.handle(
    MANTA_IPC_CHANNELS.addTask,
    async (_event, projectRoot: string, title: string): Promise<AddTaskResult> => {
      try {
        const tasksRootPath = await resolveTasksRootPath(projectRoot);
        const today = new Date().toISOString().slice(0, 10);
        return await createTask(tasksRootPath, title.trim(), today);
      } catch (error) {
        return failureFromError(error);
      }
    },
  );

  ipcMain.handle(
    MANTA_IPC_CHANNELS.moveTask,
    async (
      _event,
      projectRoot: string,
      taskId: string,
      targetStatus: TaskStatus,
    ): Promise<MoveTaskResult> => {
      try {
        const tasksRootPath = await resolveTasksRootPath(projectRoot);
        return await moveTask(tasksRootPath, taskId, targetStatus);
      } catch (error) {
        return failureFromError(error);
      }
    },
  );
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.on('ready', () => {
  registerMantaIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
