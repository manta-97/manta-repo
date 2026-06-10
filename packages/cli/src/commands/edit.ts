import { spawnSync } from 'node:child_process';
import { Command } from 'commander';
import { findTaskRef } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import {
  createCliErrorFromCoreFailure,
  createRuntimeFailureError,
  writeCliError,
} from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

/**
 * `$VISUAL`(GUI 에디터 관행) → `$EDITOR` 순으로 찾는다.
 * 에디터가 없으면 파일 경로를 알려준다 — 파일이 source of truth이므로
 * 직접 편집이 언제나 유효한 대안이다 (AI 에이전트는 보통 이 경로를 쓴다).
 */
function resolveEditorCommand(): string | null {
  const editorCommand = process.env.VISUAL ?? process.env.EDITOR;
  if (editorCommand === undefined || editorCommand.trim() === '') {
    return null;
  }
  return editorCommand.trim();
}

export function createEditCommand(): Command {
  const command = new Command('edit');
  applyHelpEntryToCommand(command, findHelpEntry('edit')!);

  command.action(async (taskId: string) => {
    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const refResult = await findTaskRef(context.tasksRootPath, taskId);
    if (!refResult.ok) {
      writeCliError(createCliErrorFromCoreFailure(refResult));
      return;
    }

    const editorCommand = resolveEditorCommand();
    if (editorCommand === null) {
      writeCliError(
        createRuntimeFailureError(
          `No editor configured. Set $EDITOR (or $VISUAL), or edit the file directly: ${refResult.ref.filePath}`,
        ),
      );
      return;
    }

    // "code --wait"처럼 인자가 포함된 EDITOR 값을 지원한다.
    const [editorBinary, ...editorArgs] = editorCommand.split(/\s+/);
    const editorProcess = spawnSync(editorBinary, [...editorArgs, refResult.ref.filePath], {
      stdio: 'inherit',
    });

    if (editorProcess.error !== undefined) {
      writeCliError(
        createRuntimeFailureError(`Failed to launch editor: ${editorProcess.error.message}`),
      );
      return;
    }
    if (editorProcess.status !== 0) {
      writeCliError(
        createRuntimeFailureError(`Editor exited with code ${editorProcess.status ?? 'unknown'}`),
      );
      return;
    }
  });

  return command;
}
