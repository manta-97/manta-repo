import { Command } from 'commander';
import chalk from 'chalk';
import { moveTask, TaskStatus } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { createCliErrorFromCoreFailure, writeCliError } from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

/**
 * `manta start`와 `manta done`은 "task 파일을 목표 상태 폴더로 옮긴다"는
 * 같은 동작에 목표 상태만 다르다. 한 팩토리로 두 명령을 만든다.
 */
export function createMoveTaskCommand(commandName: string, targetStatus: TaskStatus): Command {
  const command = new Command(commandName);
  applyHelpEntryToCommand(command, findHelpEntry(commandName)!);

  command.action(async (taskId: string) => {
    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const result = await moveTask(context.tasksRootPath, taskId, targetStatus);
    if (!result.ok) {
      writeCliError(createCliErrorFromCoreFailure(result));
      return;
    }

    if (!result.moved) {
      // 이미 목표 상태면 no-op + 안내 + exit 0 (느슨한 state machine 계약).
      console.log(chalk.yellow(`${result.id} is already ${targetStatus} (no-op).`));
      return;
    }

    console.log(chalk.green(`${result.id}: ${result.from} → ${result.to}`));
  });

  return command;
}

export function createStartCommand(): Command {
  return createMoveTaskCommand('start', 'in-progress');
}

export function createDoneCommand(): Command {
  return createMoveTaskCommand('done', 'done');
}
