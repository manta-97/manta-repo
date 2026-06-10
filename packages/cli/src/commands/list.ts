import { Command } from 'commander';
import chalk from 'chalk';
import { listTasks, TASK_STATUSES, TaskListEntry } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { createCliErrorFromCoreFailure, writeCliError } from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

const ID_COLUMN_MIN_WIDTH = 8;

function renderTaskRow(entry: TaskListEntry, idColumnWidth: number): string {
  const title = entry.malformed ? chalk.red('(malformed task file)') : entry.title;
  const created = entry.created === null ? '' : chalk.dim(entry.created);
  return `  ${entry.id.padEnd(idColumnWidth)}${title}  ${created}`.trimEnd();
}

export function renderTaskList(entries: TaskListEntry[]): string {
  if (entries.length === 0) {
    return 'No tasks yet. Create one with `manta add "title"`.';
  }

  const idColumnWidth = Math.max(
    ID_COLUMN_MIN_WIDTH,
    entries.reduce((max, entry) => Math.max(max, entry.id.length), 0) + 2,
  );

  const lines: string[] = [];
  for (const status of TASK_STATUSES) {
    const entriesInStatus = entries.filter((entry) => entry.status === status);
    lines.push(`${chalk.bold(status)} ${chalk.dim(`(${entriesInStatus.length})`)}`);
    for (const entry of entriesInStatus) {
      lines.push(renderTaskRow(entry, idColumnWidth));
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function createListCommand(): Command {
  const command = new Command('list');
  applyHelpEntryToCommand(command, findHelpEntry('list')!);

  command.action(async () => {
    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const entries = await listTasks(context.tasksRootPath);
    console.log(renderTaskList(entries));
  });

  return command;
}
