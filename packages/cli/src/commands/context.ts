import { Command } from 'commander';
import { buildContextDocument, readTask, Task } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import {
  createCliErrorFromCoreFailure,
  createUsageError,
  writeCliError,
} from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

export function createContextCommand(): Command {
  const command = new Command('context');
  applyHelpEntryToCommand(command, findHelpEntry('context')!);

  command.action(async (taskIds: string[], options: { maxChars?: string }) => {
    let maxChars: number | undefined;
    if (options.maxChars !== undefined) {
      const parsedMaxChars = Number(options.maxChars);
      if (!Number.isInteger(parsedMaxChars) || parsedMaxChars <= 0) {
        writeCliError(createUsageError('--max-chars must be a positive integer'));
        return;
      }
      maxChars = parsedMaxChars;
    }

    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    // all-or-nothing 계약: 하나라도 조회에 실패하면 stdout에 아무것도 내지 않는다.
    // partial context는 조용히 잘못된 입력이 되어 AI 세션을 오염시킨다.
    const tasks: Task[] = [];
    for (const taskId of taskIds) {
      const result = await readTask(context.tasksRootPath, taskId);
      if (!result.ok) {
        writeCliError(createCliErrorFromCoreFailure(result));
        return;
      }
      tasks.push(result.task);
    }

    console.log(buildContextDocument(tasks, { maxChars }));
  });

  return command;
}
