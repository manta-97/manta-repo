import * as path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { findMantaRoot, getMantaHomeDir, readProjectAnchor, registerProject } from '@manta/core';
import { checkIndex, rebuildIndex } from '@manta/engine';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import {
  createRuntimeFailureError,
  createUsageError,
  writeCliError,
} from '../errors/cli-error-policy';

/**
 * 현재 위치가 Manta 프로젝트라면 레지스트리의 경로를 먼저 갱신한다.
 * 폴더가 이동된 프로젝트는 anchor의 projectId로 기존 엔트리를 찾아
 * 새 경로로 upsert되므로, 이어지는 rebuild가 last_seen_path를 바로잡는다.
 */
async function refreshCurrentProjectRegistration(
  cwd: string,
  globalDataDir: string,
): Promise<void> {
  const projectRoot = findMantaRoot(cwd);
  if (projectRoot === null) {
    return;
  }
  const anchor = await readProjectAnchor(projectRoot);
  if (anchor === null) {
    return;
  }
  await registerProject(globalDataDir, {
    projectId: anchor.projectId,
    name: path.basename(projectRoot),
    projectRoot,
    taskDirName: path.basename(path.resolve(projectRoot, anchor.taskDir)),
    registeredAt: new Date().toISOString().slice(0, 10),
  });
}

export function createIndexCommand(): Command {
  const command = new Command('index');
  applyHelpEntryToCommand(command, findHelpEntry('index')!);

  command.action(async (action: string) => {
    if (action !== 'rebuild' && action !== 'check') {
      writeCliError(createUsageError(`index action must be one of: rebuild, check`));
      return;
    }

    const globalDataDir = getMantaHomeDir();
    await refreshCurrentProjectRegistration(process.cwd(), globalDataDir);

    if (action === 'rebuild') {
      const result = await rebuildIndex(globalDataDir);
      console.log(
        chalk.green(
          `Indexed ${result.projectCount} project(s), ${result.taskCount} task(s) → ${result.databasePath}`,
        ),
      );
      for (const skippedProject of result.skipped) {
        console.log(
          chalk.yellow(`  skipped: ${skippedProject.projectRoot} (${skippedProject.reason})`),
        );
      }
      return;
    }

    const result = await checkIndex(globalDataDir);
    if (result.ok) {
      console.log(
        chalk.green(`Index OK (${result.projectCount} project(s), ${result.taskCount} task(s)).`),
      );
      return;
    }

    for (const issue of result.issues) {
      console.log(`  ${chalk.yellow(issue.type)}: ${issue.detail}`);
    }
    writeCliError(
      createRuntimeFailureError(
        `Index check found ${result.issues.length} issue(s). Run \`manta index rebuild\`.`,
      ),
    );
  });

  return command;
}
