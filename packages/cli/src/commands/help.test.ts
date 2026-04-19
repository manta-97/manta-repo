import chalk from 'chalk';
import { Command, CommanderError } from 'commander';
import { commandHelpEntries, findHelpEntry } from '../help/command-registry';
import { commandFactories } from './command-factories';
import { applyHelpEntryToCommand } from '../help/apply-help-entry';
import { renderCommand } from '../help/render-help';
import { createHelpCommand } from './help';

beforeAll(() => {
  chalk.level = 0;
});

describe('createHelpCommand action', () => {
  const sampleEntry = commandHelpEntries[0];

  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.exitCode = 0;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = 0;
  });

  function runHelp(argv: string[]): void {
    const program = new Command();
    program.exitOverride();
    program.addCommand(createHelpCommand());
    program.parse(['node', 'manta', 'help', ...argv]);
  }

  it('should render overview prose when called with no arguments', () => {
    runHelp([]);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('Manta');
    expect(output).toContain('COMMANDS');
    for (const entry of commandHelpEntries) {
      expect(output).toContain(entry.name);
    }
  });

  it('should render command detail prose when given a known command name', () => {
    runHelp([sampleEntry.name]);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain(`manta ${sampleEntry.name}`);
    if (sampleEntry.args.length > 0) {
      expect(output).toContain('ARGUMENTS');
    } else {
      expect(output).toContain(sampleEntry.usage);
    }
  });

  it('should emit overview JSON when --json flag is set', () => {
    runHelp(['--json']);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.kind).toBe('overview');
    expect(parsed.version).toBe('1');
    expect(Array.isArray(parsed.commands)).toBe(true);
  });

  it('should emit command JSON when --json is combined with a known command name', () => {
    runHelp([sampleEntry.name, '--json']);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.kind).toBe('command');
    expect(parsed.version).toBe('1');
    expect(parsed.command.name).toBe(sampleEntry.name);
  });

  it('should write to stderr and set exitCode=1 for unknown command name', () => {
    runHelp(['xyz']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0] as string).toContain('Unknown command: xyz');
    expect(process.exitCode).toBe(1);
  });
});

describe('registry example inputs', () => {
  it('should parse every example input via Commander without error', () => {
    for (const entry of commandHelpEntries) {
      for (const example of entry.examples) {
        const tokens = example.input.split(/\s+/).slice(1);
        const program = new Command();
        program.exitOverride();

        for (const registeredEntry of commandHelpEntries) {
          const sub = commandFactories[registeredEntry.name]();
          sub.action(() => {});
          program.addCommand(sub);
        }

        expect(() => {
          program.parse(tokens, { from: 'user' });
        }).not.toThrow();
      }
    }
  });
});

describe('subcommand --help routing', () => {
  function captureHelp(subcommand: Command, argv: string[]): string {
    const program = new Command();
    program.exitOverride();
    subcommand.exitOverride();
    let captured = '';
    const writers = {
      writeOut: (str: string) => {
        captured += str;
      },
      writeErr: (str: string) => {
        captured += str;
      },
    };
    program.configureOutput(writers);
    subcommand.configureOutput(writers);
    program.addCommand(subcommand);
    try {
      program.parse(argv, { from: 'user' });
    } catch (err) {
      if (!(err instanceof CommanderError)) throw err;
    }
    return captured;
  }

  for (const entry of commandHelpEntries) {
    it(`should render renderCommand(${entry.name}Entry) when \`manta ${entry.name} --help\` is invoked`, () => {
      const output = captureHelp(commandFactories[entry.name](), [entry.name, '--help']);
      expect(output).toContain(renderCommand(findHelpEntry(entry.name)!));
    });
  }
});

describe('help command option parsing', () => {
  const scenarios: ReadonlyArray<{
    input: string;
    expectedName: string | undefined;
    expectedJson: boolean | undefined;
  }> = [
    { input: 'manta help', expectedName: undefined, expectedJson: undefined },
    { input: 'manta help --json', expectedName: undefined, expectedJson: true },
    ...commandHelpEntries.flatMap((entry) => [
      { input: `manta help ${entry.name}`, expectedName: entry.name, expectedJson: undefined },
      { input: `manta help ${entry.name} --json`, expectedName: entry.name, expectedJson: true },
    ]),
  ];

  for (const scenario of scenarios) {
    it(`should parse "${scenario.input}" into expected (name, --json) pair`, () => {
      let receivedName: string | undefined;
      let receivedJson: boolean | undefined;

      const program = new Command();
      program.exitOverride();
      const help = new Command('help');
      applyHelpEntryToCommand(help, findHelpEntry('help')!);
      help.action((name: string | undefined, options: { json?: boolean }) => {
        receivedName = name;
        receivedJson = options.json;
      });
      program.addCommand(help);

      const tokens = scenario.input.split(/\s+/).slice(1);
      program.parse(tokens, { from: 'user' });

      expect(receivedName).toBe(scenario.expectedName);
      expect(receivedJson).toBe(scenario.expectedJson);
    });
  }
});

describe('commandFactories coverage', () => {
  it('should have a factory for every registry entry', () => {
    for (const entry of commandHelpEntries) {
      expect(typeof commandFactories[entry.name]).toBe('function');
    }
  });

  it('should not have stale factories missing from the registry', () => {
    const registeredNames = new Set(commandHelpEntries.map((entry) => entry.name));
    for (const factoryName of Object.keys(commandFactories)) {
      expect(registeredNames.has(factoryName)).toBe(true);
    }
  });
});
