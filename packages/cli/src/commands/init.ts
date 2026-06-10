import * as path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { resolveTaskDirPath, initializeMantaProject, getMantaHomeDir } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { createRuntimeFailureError, writeCliError } from '../errors/cli-error-policy';

/**
 * `manta init [path]` 서브커맨드를 생성하는 팩토리 함수.
 *
 * @returns commander `Command` 인스턴스. `program.addCommand()`로 등록.
 */
export function createInitCommand(): Command {
  const command = new Command('init');
  applyHelpEntryToCommand(command, findHelpEntry('init')!);

  command.action(async (inputPath: string | undefined) => {
    const projectRoot = process.cwd();
    const taskDirPath = resolveTaskDirPath(inputPath, projectRoot);
    const globalDataDir = getMantaHomeDir();

    const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    if (!result.ok) {
      if (result.error === 'ALREADY_INITIALIZED') {
        console.log(chalk.yellow(result.message));
        return;
      }
      // core Result 실패는 Commander usage error가 아니라 실행 중 실패다.
      // 따라서 exit 1과 RUNTIME_FAILURE code를 사용한다.
      writeCliError(createRuntimeFailureError(result.message));
      return;
    }

    console.log(chalk.green(`Initialized Manta project at ${result.projectRoot}`));
    console.log(`  marker:  .manta/ (project.json: ${result.projectId})`);
    console.log(`  tasks:   ${path.basename(result.taskDirPath)}/tasks/{todo,in-progress,done}/`);
  });

  return command;
}
