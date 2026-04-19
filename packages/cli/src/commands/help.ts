import { Command } from 'commander';
import { commandHelpEntries, findHelpEntry } from '../help/command-registry';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { renderCommand, renderOverview, toCommandJson, toOverviewJson } from '../help/render-help';

export function createHelpCommand(): Command {
  const command = new Command('help');
  const entry = findHelpEntry('help')!;
  applyHelpEntryToCommand(command, entry);

  command.action((commandName: string | undefined, options: { json?: boolean }) => {
    if (!commandName) {
      if (options.json) {
        console.log(JSON.stringify(toOverviewJson(commandHelpEntries), null, 2));
      } else {
        console.log(renderOverview(commandHelpEntries));
      }
      return;
    }

    const targetEntry = findHelpEntry(commandName);
    if (!targetEntry) {
      console.error(
        `Unknown command: ${commandName}. Run \`manta help\` to see available commands.`,
      );
      process.exitCode = 1;
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(toCommandJson(targetEntry), null, 2));
    } else {
      console.log(renderCommand(targetEntry));
    }
  });

  return command;
}
