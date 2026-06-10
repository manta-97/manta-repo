import { Command } from 'commander';
import { exportTasks } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { createCliErrorFromCoreFailure, writeCliError } from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

export function createExportCommand(): Command {
  const command = new Command('export');
  applyHelpEntryToCommand(command, findHelpEntry('export')!);

  command.action(async () => {
    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const { bundle, skipped } = await exportTasks(context.projectRoot);

    // stdout은 순수 JSON이어야 한다 (`manta export > tasks.json`).
    // 내보내지 못한 task는 경고로만 알리고 exit 0을 유지한다.
    for (const skippedTask of skipped) {
      console.error(`warning: skipped ${skippedTask.id} (${skippedTask.reason})`);
    }
    console.log(JSON.stringify(bundle, null, 2));
  });

  return command;
}
