import { CommanderError } from 'commander';
import {
  CLI_EXIT_CODES,
  createCliErrorFromCommanderError,
  createCliErrorFromCoreFailure,
  createRuntimeFailureError,
  createUnknownCommandError,
  createUsageError,
  formatCliError,
  sanitizeCliErrorValue,
} from './cli-error-policy';

describe('cli error policy', () => {
  it('should classify unknown command as usage error with stable code', () => {
    const cliTextError = createUnknownCommandError('missing');

    expect(cliTextError).toEqual({
      code: 'UNKNOWN_COMMAND',
      exitCode: CLI_EXIT_CODES.usageError,
      message: 'Unknown command: missing. Run `manta help` to see available commands.',
    });
  });

  it('should classify runtime failures separately from usage errors', () => {
    const cliTextError = createRuntimeFailureError('Permission denied: /project');

    expect(cliTextError.code).toBe('RUNTIME_FAILURE');
    expect(cliTextError.exitCode).toBe(CLI_EXIT_CODES.runtimeFailure);
    expect(formatCliError(cliTextError)).toBe(
      '[RUNTIME_FAILURE] Runtime failure: Permission denied: /project',
    );
  });

  it('should normalize Commander usage messages', () => {
    const cliTextError = createUsageError("error: unknown option '--bad'");

    expect(cliTextError).toEqual({
      code: 'USAGE_ERROR',
      exitCode: CLI_EXIT_CODES.usageError,
      message: "Usage error: unknown option '--bad'",
    });
  });

  it('should map Commander unknown command to the Manta unknown command contract', () => {
    const commanderError = new CommanderError(
      1,
      'commander.unknownCommand',
      "error: unknown command 'xyz'",
    );

    expect(createCliErrorFromCommanderError(commanderError)).toEqual(
      createUnknownCommandError('xyz'),
    );
  });

  it('should map Commander parse failures to usage errors', () => {
    const commanderError = new CommanderError(
      1,
      'commander.unknownOption',
      "error: unknown option '--bad'",
    );

    expect(createCliErrorFromCommanderError(commanderError)).toEqual(
      createUsageError("error: unknown option '--bad'"),
    );
  });

  it('should map core INVALID_TASK_ID failures to usage errors', () => {
    const cliTextError = createCliErrorFromCoreFailure({
      ok: false,
      error: 'INVALID_TASK_ID',
      message: 'Invalid task id: task-abc. Expected format: task-<number> (e.g. task-3).',
    });

    expect(cliTextError.code).toBe('USAGE_ERROR');
    expect(cliTextError.exitCode).toBe(CLI_EXIT_CODES.usageError);
  });

  it('should map other core failures to runtime failures', () => {
    const cliTextError = createCliErrorFromCoreFailure({
      ok: false,
      error: 'TASK_NOT_FOUND',
      message: 'Task not found: task-99',
    });

    expect(cliTextError).toEqual({
      code: 'RUNTIME_FAILURE',
      exitCode: CLI_EXIT_CODES.runtimeFailure,
      message: 'Runtime failure: Task not found: task-99',
    });
  });

  it('should sanitize user-controlled values before rendering stderr', () => {
    expect(sanitizeCliErrorValue('bad\n\x1b[31mvalue\x1b[0m\tname')).toBe('bad value name');
  });

  it('should truncate very long user-controlled values', () => {
    const sanitizedValue = sanitizeCliErrorValue('a'.repeat(500));

    expect(sanitizedValue).toHaveLength(303);
    expect(sanitizedValue.endsWith('...')).toBe(true);
  });
});
