import chalk from 'chalk';
import { commandHelpEntries, findHelpEntry } from './command-registry';
import { renderCommand, renderOverview, toCommandJson, toOverviewJson } from './render-help';

beforeAll(() => {
  chalk.level = 0;
});

describe('renderOverview', () => {
  it('should include every entry name and summary', () => {
    const output = renderOverview(commandHelpEntries);
    for (const entry of commandHelpEntries) {
      expect(output).toContain(entry.name);
      expect(output).toContain(entry.summary);
    }
  });

  it('should include the footer lines', () => {
    const output = renderOverview(commandHelpEntries);
    expect(output).toContain('Run `manta help <command>` for details.');
    expect(output).toContain('Status model: todo → in-progress → done.');
  });
});

describe('renderCommand', () => {
  for (const entry of commandHelpEntries) {
    it(`should render "${entry.name}" entry with expected sections`, () => {
      const output = renderCommand(entry);

      expect(output).toContain(`manta ${entry.name} — ${entry.summary}`);
      expect(output).toContain('USAGE');
      expect(output).toContain(entry.usage);

      if (entry.args.length > 0) {
        expect(output).toContain('ARGUMENTS');
        for (const arg of entry.args) {
          expect(output).toContain(arg.name);
        }
      }

      if (entry.options.length > 0) {
        expect(output).toContain('OPTIONS');
        for (const option of entry.options) {
          expect(output).toContain(option.flag);
        }
      }

      if (entry.examples.length > 0) {
        expect(output).toContain('EXAMPLES');
        for (const example of entry.examples) {
          expect(output).toContain(`$ ${example.input}`);
        }
      }
    });
  }

  it('should omit ARGUMENTS when entry has no args', () => {
    const output = renderCommand({
      name: 'nop',
      summary: 'does nothing',
      usage: 'manta nop',
      args: [],
      options: [],
      examples: [],
    });
    expect(output).not.toContain('ARGUMENTS');
    expect(output).not.toContain('OPTIONS');
    expect(output).not.toContain('EXAMPLES');
  });
});

describe('toOverviewJson', () => {
  it('should return kind=overview and version=1 with all commands', () => {
    const json = toOverviewJson(commandHelpEntries);
    expect(json.kind).toBe('overview');
    expect(json.version).toBe('1');
    expect(json.commands).toHaveLength(commandHelpEntries.length);
    expect(json.commands.map((c) => c.name)).toEqual(commandHelpEntries.map((e) => e.name));
  });
});

describe('toCommandJson', () => {
  for (const entry of commandHelpEntries) {
    it(`should return kind=command and version=1 wrapping the "${entry.name}" entry`, () => {
      const json = toCommandJson(entry);
      expect(json.kind).toBe('command');
      expect(json.version).toBe('1');
      expect(json.command.name).toBe(entry.name);
    });
  }
});

describe('findHelpEntry', () => {
  for (const entry of commandHelpEntries) {
    it(`should return the entry when name matches "${entry.name}"`, () => {
      expect(findHelpEntry(entry.name)?.name).toBe(entry.name);
    });
  }

  it('should return undefined for unknown name', () => {
    expect(findHelpEntry('xyz')).toBeUndefined();
  });
});
