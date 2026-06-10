import * as path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { createTask } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import {
  createCliErrorFromCoreFailure,
  createUsageError,
  writeCliError,
} from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

export function createAddCommand(): Command {
  const command = new Command('add');
  applyHelpEntryToCommand(command, findHelpEntry('add')!);

  command.action(async (title: string) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') {
      writeCliError(createUsageError('title must not be empty'));
      return;
    }

    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const result = await createTask(context.tasksRootPath, trimmedTitle, today);
    if (!result.ok) {
      writeCliError(createCliErrorFromCoreFailure(result));
      return;
    }

    console.log(chalk.green(`Created ${result.task.id}: ${result.task.title} (todo)`));
    console.log(`  file: ${path.relative(context.projectRoot, result.task.filePath)}`);
  });

  return command;
}
