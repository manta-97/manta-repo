import { Command } from 'commander';
import { CommandHelpEntry } from './types';
import { renderCommand } from './render-help';

export function applyHelpEntryToCommand(command: Command, entry: CommandHelpEntry): Command {
  command.description(entry.summary);

  for (const arg of entry.args) {
    const argSpec = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
    command.argument(argSpec, arg.description);
  }

  for (const option of entry.options) {
    command.option(option.flag, option.description);
  }

  command.configureHelp({
    formatHelp: () => renderCommand(entry),
  });

  return command;
}
