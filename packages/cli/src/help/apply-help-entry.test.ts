import chalk from 'chalk';
import { Command } from 'commander';
import { applyHelpEntryToCommand } from './apply-help-entry';
import { renderCommand } from './render-help';
import { CommandHelpEntry } from './types';

beforeAll(() => {
  chalk.level = 0;
});

function makeEntry(partial: Partial<CommandHelpEntry> = {}): CommandHelpEntry {
  return {
    name: 'demo',
    summary: 'a demo command',
    usage: 'manta demo',
    args: [],
    options: [],
    examples: [],
    ...partial,
  };
}

describe('applyHelpEntryToCommand', () => {
  it('should set the command description from entry.summary', () => {
    const command = new Command('demo');
    applyHelpEntryToCommand(command, makeEntry({ summary: 'does a thing' }));
    expect(command.description()).toBe('does a thing');
  });

  it('should register required args with <name> and optional args with [name]', () => {
    const command = new Command('demo');
    applyHelpEntryToCommand(
      command,
      makeEntry({
        args: [
          { name: 'source', required: true, description: 'src desc' },
          { name: 'target', required: false, description: 'tgt desc' },
        ],
      }),
    );

    expect(command.registeredArguments).toHaveLength(2);
    expect(command.registeredArguments[0].name()).toBe('source');
    expect(command.registeredArguments[0].required).toBe(true);
    expect(command.registeredArguments[0].description).toBe('src desc');
    expect(command.registeredArguments[1].name()).toBe('target');
    expect(command.registeredArguments[1].required).toBe(false);
    expect(command.registeredArguments[1].description).toBe('tgt desc');
  });

  it('should register each option with its flag and description', () => {
    const command = new Command('demo');
    applyHelpEntryToCommand(
      command,
      makeEntry({
        options: [
          { flag: '--json', description: 'emit JSON' },
          { flag: '-v, --verbose', description: 'verbose output' },
        ],
      }),
    );

    expect(command.options).toHaveLength(2);
    expect(command.options[0].flags).toBe('--json');
    expect(command.options[0].description).toBe('emit JSON');
    expect(command.options[1].flags).toBe('-v, --verbose');
    expect(command.options[1].description).toBe('verbose output');
  });

  it('should route helpInformation() through renderCommand(entry)', () => {
    const entry = makeEntry({
      name: 'demo',
      summary: 'does a thing',
      usage: 'manta demo [path]',
      args: [{ name: 'path', required: false, description: 'where' }],
      options: [{ flag: '--json', description: 'json mode' }],
      examples: [{ input: 'manta demo' }],
    });
    const command = new Command('demo');
    applyHelpEntryToCommand(command, entry);

    expect(command.helpInformation()).toBe(renderCommand(entry) + '\n');
  });
});
