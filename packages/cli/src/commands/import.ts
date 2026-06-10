import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Command } from 'commander';
import chalk from 'chalk';
import { importTasks } from '@manta/core';
import { findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import {
  createCliErrorFromCoreFailure,
  createRuntimeFailureError,
  writeCliError,
} from '../errors/cli-error-policy';
import { loadProjectContext } from './project-context';

export function createImportCommand(): Command {
  const command = new Command('import');
  applyHelpEntryToCommand(command, findHelpEntry('import')!);

  command.action(async (bundleFilePath: string) => {
    const context = await loadProjectContext(process.cwd());
    if (!context.ok) {
      writeCliError(createCliErrorFromCoreFailure(context));
      return;
    }

    const resolvedBundlePath = path.resolve(process.cwd(), bundleFilePath);
    let bundleFileContent: string;
    try {
      bundleFileContent = await fs.readFile(resolvedBundlePath, 'utf-8');
    } catch {
      writeCliError(createRuntimeFailureError(`Cannot read import file: ${resolvedBundlePath}`));
      return;
    }

    let parsedBundle: unknown;
    try {
      parsedBundle = JSON.parse(bundleFileContent);
    } catch {
      writeCliError(
        createRuntimeFailureError(`Import file is not valid JSON: ${resolvedBundlePath}`),
      );
      return;
    }

    const result = await importTasks(context.tasksRootPath, parsedBundle);
    if (!result.ok) {
      writeCliError(createCliErrorFromCoreFailure(result));
      return;
    }

    console.log(chalk.green(`Imported ${result.imported.length} task(s).`));
    for (const mapping of result.imported) {
      console.log(`  ${mapping.sourceId} → ${mapping.newId} (${mapping.status})`);
    }
  });

  return command;
}
