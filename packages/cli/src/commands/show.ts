import * as path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { readTask } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { createCliErrorFromCoreFailure, writeCliError } from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

export function createShowCommand(): Command {
  const command = new Command('show');
  applyHelpEntryToCommand(command, findHelpEntry('show')!);

  command.action(async (taskId: string) => {
    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const result = await readTask(context.tasksRootPath, taskId);
    if (!result.ok) {
      writeCliError(createCliErrorFromCoreFailure(result));
      return;
    }
    const { task } = result;

    const lines = [
      `${chalk.bold(task.id)} — ${task.title}`,
      '',
      `  status:   ${task.status}`,
      `  created:  ${task.created}`,
      // 파일 경로를 보여주는 이유: AI와 사용자가 CLI를 거치지 않고
      // 파일을 직접 열어 수정할 수 있어야 한다 (파일이 source of truth).
      `  file:     ${path.relative(context.projectRoot, task.filePath)}`,
      '',
      task.body.trim() === '' ? chalk.dim('(no body)') : task.body.trimEnd(),
    ];
    console.log(lines.join('\n'));
  });

  return command;
}
