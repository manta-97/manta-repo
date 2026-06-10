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
    name: 'add',
    summary: 'Create a new task in todo',
    usage: 'manta add "<title>"',
    args: [{ name: 'title', required: true, description: 'task title' }],
    options: [],
    examples: [{ input: 'manta add "Fix OAuth login"' }],
  },
  {
    name: 'list',
    summary: 'List tasks grouped by status',
    usage: 'manta list',
    args: [],
    options: [],
    examples: [{ input: 'manta list' }],
  },
  {
    name: 'show',
    summary: 'Show task details',
    usage: 'manta show <id>',
    args: [{ name: 'id', required: true, description: 'task id (e.g. task-3)' }],
    options: [],
    examples: [{ input: 'manta show task-3' }],
  },
  {
    name: 'start',
    summary: 'Move a task to in-progress',
    usage: 'manta start <id>',
    args: [{ name: 'id', required: true, description: 'task id (e.g. task-3)' }],
    options: [],
    examples: [{ input: 'manta start task-3' }],
  },
  {
    name: 'done',
    summary: 'Move a task to done',
    usage: 'manta done <id>',
    args: [{ name: 'id', required: true, description: 'task id (e.g. task-3)' }],
    options: [],
    examples: [{ input: 'manta done task-3' }],
  },
  {
    name: 'edit',
    summary: 'Open a task file in $EDITOR',
    usage: 'manta edit <id>',
    args: [{ name: 'id', required: true, description: 'task id (e.g. task-3)' }],
    options: [],
    examples: [{ input: 'manta edit task-3' }],
  },
  {
    name: 'search',
    summary: 'Search task titles and bodies',
    usage: 'manta search <query> [--status <status>]',
    args: [{ name: 'query', required: true, description: 'text to search for' }],
    options: [
      { flag: '--status <status>', description: 'filter by status: todo | in-progress | done' },
    ],
    examples: [
      { input: 'manta search "auth"' },
      { input: 'manta search --status done "migration"' },
    ],
  },
  {
    name: 'context',
    summary: 'Assemble tasks into an AI-ready context document',
    usage: 'manta context <id...> [--max-chars <n>]',
    args: [
      {
        name: 'id',
        required: true,
        variadic: true,
        description: 'one or more task ids (e.g. task-1 task-4)',
      },
    ],
    options: [{ flag: '--max-chars <n>', description: 'limit output length to n characters' }],
    examples: [
      { input: 'manta context task-1' },
      { input: 'manta context task-1 task-4 --max-chars 6000' },
    ],
  },
  {
    name: 'export',
    summary: 'Export all tasks as a JSON bundle to stdout',
    usage: 'manta export',
    args: [],
    options: [],
    examples: [{ input: 'manta export' }],
  },
  {
    name: 'import',
    summary: 'Import tasks from an exported JSON bundle',
    usage: 'manta import <file>',
    args: [{ name: 'file', required: true, description: 'path to a manta export JSON file' }],
    options: [],
    examples: [{ input: 'manta import tasks.json' }],
  },
  {
    name: 'index',
    summary: 'Rebuild or check the root SQLite index (~/.manta/manta.sqlite)',
    usage: 'manta index <action>',
    args: [{ name: 'action', required: true, description: 'rebuild | check' }],
    options: [],
    examples: [{ input: 'manta index rebuild' }, { input: 'manta index check' }],
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
