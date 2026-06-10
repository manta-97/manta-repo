import { Command } from 'commander';
import chalk from 'chalk';
import { searchTasks, TASK_STATUSES, TaskSearchMatch, TaskStatus } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import {
  createCliErrorFromCoreFailure,
  createUsageError,
  writeCliError,
} from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function renderSearchMatches(
  matches: TaskSearchMatch[],
  query: string,
  statusFilter: TaskStatus | undefined,
): string {
  if (matches.length === 0) {
    // cli-design.md 계약: 결과 없음 메시지는 명확해야 하고 exit code는 0이다.
    return statusFilter === undefined
      ? `No tasks matched "${query}".`
      : `No ${statusFilter} tasks matched "${query}".`;
  }

  const lines: string[] = [];
  for (const match of matches) {
    lines.push(`${chalk.bold(match.id)} ${chalk.dim(`(${match.status})`)} — ${match.title}`);
    if (match.snippet !== null) {
      lines.push(`    ${chalk.dim(match.snippet)}`);
    }
  }
  return lines.join('\n');
}

export function createSearchCommand(): Command {
  const command = new Command('search');
  applyHelpEntryToCommand(command, findHelpEntry('search')!);

  command.action(async (query: string, options: { status?: string }) => {
    if (query.trim() === '') {
      writeCliError(createUsageError('query must not be empty'));
      return;
    }

    if (options.status !== undefined && !isTaskStatus(options.status)) {
      writeCliError(createUsageError(`--status must be one of: ${TASK_STATUSES.join(', ')}`));
      return;
    }
    const statusFilter = options.status as TaskStatus | undefined;

    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const matches = await searchTasks(context.tasksRootPath, query.trim(), statusFilter);
    console.log(renderSearchMatches(matches, query.trim(), statusFilter));
  });

  return command;
}
