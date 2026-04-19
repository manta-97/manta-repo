import { CommandHelpEntry } from './types';

export const commandHelpEntries: readonly CommandHelpEntry[] = [
  {
    name: 'init',
    summary: 'Initialize a Manta project in the current directory',
    usage: 'manta init [path]',
    args: [{ name: 'path', required: false, description: 'task directory name (default: manta)' }],
    options: [],
    examples: [{ input: 'manta init' }, { input: 'manta init docs' }],
  },
  {
    name: 'help',
    summary: 'Show command list or details',
    usage: 'manta help [command]',
    args: [{ name: 'command', required: false, description: 'command name to show details for' }],
    options: [{ flag: '--json', description: 'emit machine-readable JSON instead of prose' }],
    examples: [
      { input: 'manta help' },
      { input: 'manta help init' },
      { input: 'manta help --json' },
      { input: 'manta help init --json' },
    ],
  },
];

export function findHelpEntry(name: string): CommandHelpEntry | undefined {
  return commandHelpEntries.find((entry) => entry.name === name);
}
