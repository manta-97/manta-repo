import { contextBridge, ipcRenderer } from 'electron';
import type { TaskStatus } from '@manta/core';
import { MANTA_IPC_CHANNELS, MantaApi } from './shared/manta-api';

/**
 * renderer에는 node 접근 권한이 없다 (contextIsolation).
 * 여기서 노출하는 좁은 API가 renderer가 작업 파일에 닿는 유일한 통로다.
 */
const mantaApi: MantaApi = {
  listProjects: () => ipcRenderer.invoke(MANTA_IPC_CHANNELS.listProjects),
  listTasks: (projectRoot: string) => ipcRenderer.invoke(MANTA_IPC_CHANNELS.listTasks, projectRoot),
  readTask: (projectRoot: string, taskId: string) =>
    ipcRenderer.invoke(MANTA_IPC_CHANNELS.readTask, projectRoot, taskId),
  addTask: (projectRoot: string, title: string) =>
    ipcRenderer.invoke(MANTA_IPC_CHANNELS.addTask, projectRoot, title),
  moveTask: (projectRoot: string, taskId: string, targetStatus: TaskStatus) =>
    ipcRenderer.invoke(MANTA_IPC_CHANNELS.moveTask, projectRoot, taskId, targetStatus),
};

contextBridge.exposeInMainWorld('manta', mantaApi);
