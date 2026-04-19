import * as path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { resolveTaskDirPath, initializeMantaProject, getMantaDataDir } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';

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
    const globalDataDir = getMantaDataDir();

    const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

    if (!result.ok) {
      if (result.error === 'ALREADY_INITIALIZED') {
        console.log(chalk.yellow(result.message));
        return;
      }
      console.error(chalk.red(`Error: ${result.message}`));
      process.exitCode = 1;
      return;
    }

    console.log(chalk.green(`Initialized Manta project at ${result.projectRoot}`));
    console.log(`  marker:  .manta/`);
    console.log(`  tasks:   ${path.basename(result.taskDirPath)}/tasks/`);
  });

  return command;
}
