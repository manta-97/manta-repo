import chalk from 'chalk';
import { CommandHelpEntry, CommandJson, OverviewJson } from './types';

const INDENT = '  ';
const MIN_NAME_COLUMN_WIDTH = 14;

function nameColumnWidth(names: readonly string[]): number {
  const longest = names.reduce((max, name) => Math.max(max, name.length), 0);
  return Math.max(MIN_NAME_COLUMN_WIDTH, longest + 2);
}

function renderTwoColumn(rows: readonly { name: string; description: string }[]): string {
  const width = nameColumnWidth(rows.map((row) => row.name));
  return rows.map((row) => `${INDENT}${row.name.padEnd(width, ' ')}${row.description}`).join('\n');
}

export function renderOverview(entries: readonly CommandHelpEntry[]): string {
  const lines: string[] = [];

  lines.push(chalk.bold('Manta') + ' — File-based task management for humans and AI');
  lines.push('');
  lines.push(chalk.bold('USAGE'));
  lines.push(`${INDENT}manta <command> [args]`);
  lines.push('');
  lines.push(chalk.bold('COMMANDS'));
  lines.push(
    renderTwoColumn(entries.map((entry) => ({ name: entry.name, description: entry.summary }))),
  );
  lines.push('');
  lines.push(chalk.dim('Run `manta help <command>` for details.'));
  lines.push('');
  lines.push(chalk.dim('Tasks live under <task-dir>/tasks/ (default: manta/tasks/).'));
  lines.push(chalk.dim('Status model: todo → in-progress → done.'));

  return lines.join('\n');
}

export function renderCommand(entry: CommandHelpEntry): string {
  const lines: string[] = [];

  lines.push(`${chalk.bold('manta ' + entry.name)} — ${entry.summary}`);
  lines.push('');
  lines.push(chalk.bold('USAGE'));
  lines.push(`${INDENT}${entry.usage}`);

  if (entry.args.length > 0) {
    lines.push('');
    lines.push(chalk.bold('ARGUMENTS'));
    lines.push(
      renderTwoColumn(entry.args.map((arg) => ({ name: arg.name, description: arg.description }))),
    );
  }

  if (entry.options.length > 0) {
    lines.push('');
    lines.push(chalk.bold('OPTIONS'));
    lines.push(
      renderTwoColumn(
        entry.options.map((option) => ({ name: option.flag, description: option.description })),
      ),
    );
  }

  if (entry.examples.length > 0) {
    lines.push('');
    lines.push(chalk.bold('EXAMPLES'));
    for (const example of entry.examples) {
      lines.push(`${INDENT}${chalk.dim('$')} ${example.input}`);
    }
  }

  return lines.join('\n');
}

export function toOverviewJson(entries: readonly CommandHelpEntry[]): OverviewJson {
  return {
    kind: 'overview',
    version: '1', // TODO:10 version을 그냥 여기서 다루는건 아주 좋지 않다. packages/cli/src/help/types.ts:27 여기에도 동일한 문제
    commands: entries.map((entry) => ({ ...entry })),
  };
}

export function toCommandJson(entry: CommandHelpEntry): CommandJson {
  return {
    kind: 'command',
    version: '1',
    command: { ...entry },
  };
}
