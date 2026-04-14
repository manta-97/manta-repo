import * as path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  resolveTaskDirPath,
  initializeMantaProject,
  getMantaDataDir,
} from '@manta/core';

/**
 * `manta init [path]` 서브커맨드를 생성하는 팩토리 함수.
 *
 * core의 순수 로직(`initializeMantaProject`)을 호출하고,
 * 결과를 받아서 터미널 출력만 담당한다.
 *
 * @returns commander `Command` 인스턴스. `program.addCommand()`로 등록.
 *
 * @example
 * ```ts
 * const program = new Command();
 * program.addCommand(createInitCommand());
 * program.parse();
 * ```
 */
export function createInitCommand(): Command {
  return new Command('init')
    // [path] — 대괄호는 선택적 인자. <path>로 쓰면 필수.
    .argument('[path]', 'task directory name (default: manta)')
    .description('Initialize a Manta project in the current directory')
    .action(async (inputPath: string | undefined) => {
      const projectRoot = process.cwd();
      const taskDirPath = resolveTaskDirPath(inputPath, projectRoot);
      const globalDataDir = getMantaDataDir();

      // core의 순수 로직 호출. CLI는 결과를 받아서 출력만 담당.
      const result = await initializeMantaProject(projectRoot, taskDirPath, globalDataDir);

      if (!result.ok) {
        if (result.error === 'ALREADY_INITIALIZED') {
          // 멱등 — 에러가 아닌 안내 수준이므로 yellow로 표시
          console.log(chalk.yellow(result.message));
          return;
        }
        console.error(chalk.red(`Error: ${result.message}`));
        // process.exitCode — 프로세스를 즉시 종료하지 않고, 끝날 때 이 코드를 반환.
        process.exitCode = 1;
        return;
      }

      console.log(chalk.green(`Initialized Manta project at ${result.projectRoot}`));
      console.log(`  marker:  .manta/`);
      console.log(`  tasks:   ${path.basename(result.taskDirPath)}/tasks/`);
    });
}
