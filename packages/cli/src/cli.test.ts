import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import chalk from 'chalk';
import { runMantaCli } from './cli';

beforeAll(() => {
  chalk.level = 0;
});

describe('runMantaCli error contract', () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    process.exitCode = 0;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  it('should emit UNKNOWN_COMMAND with exit code 2 for root unknown command', async () => {
    await runMantaCli(['node', 'manta', 'xyz']);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      '[UNKNOWN_COMMAND] Unknown command: xyz. Run `manta help` to see available commands.',
    );
    expect(process.exitCode).toBe(2);
  });

  it('should emit UNKNOWN_COMMAND with exit code 2 for help unknown command', async () => {
    await runMantaCli(['node', 'manta', 'help', 'xyz']);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      '[UNKNOWN_COMMAND] Unknown command: xyz. Run `manta help` to see available commands.',
    );
    expect(process.exitCode).toBe(2);
  });

  it('should emit USAGE_ERROR with exit code 2 for bad options', async () => {
    await runMantaCli(['node', 'manta', 'init', '--bad']);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("[USAGE_ERROR] Usage error: unknown option '--bad'");
    expect(process.exitCode).toBe(2);
  });

  it('should emit USAGE_ERROR with exit code 2 for excess arguments', async () => {
    await runMantaCli(['node', 'manta', 'help', 'init', 'extra']);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain('[USAGE_ERROR] Usage error: too many arguments');
    expect(process.exitCode).toBe(2);
  });

  it('should emit USAGE_ERROR with exit code 2 for missing required arguments', async () => {
    await runMantaCli(['node', 'manta', 'show']);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain(
      '[USAGE_ERROR] Usage error: missing required argument',
    );
    expect(process.exitCode).toBe(2);
  });

  it('should print the overview and exit 0 when called without a command', async () => {
    await runMantaCli(['node', 'manta']);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('COMMANDS');
    expect(process.exitCode).toBe(0);
  });
});

describe('manta CLI end-to-end flow', () => {
  let tmpDir: string;
  let projectDir: string;
  let originalCwd: string;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  function allLogOutput(): string {
    return logSpy.mock.calls.map((call) => call[0] as string).join('\n');
  }

  beforeEach(async () => {
    process.exitCode = 0;
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manta-cli-test-'));
    projectDir = path.join(tmpDir, 'my-project');
    await fs.mkdir(projectDir);
    process.env.MANTA_HOME = path.join(tmpDir, 'manta-home');
    process.chdir(projectDir);

    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    delete process.env.MANTA_HOME;
    errorSpy.mockRestore();
    logSpy.mockRestore();
    await fs.rm(tmpDir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it('should support the full init → add → list → show → start → done → search flow', async () => {
    await runMantaCli(['node', 'manta', 'init']);
    expect(process.exitCode).toBe(0);

    await runMantaCli(['node', 'manta', 'add', 'Fix OAuth login']);
    expect(allLogOutput()).toContain('Created task-1: Fix OAuth login (todo)');

    await runMantaCli(['node', 'manta', 'list']);
    expect(allLogOutput()).toContain('task-1');

    await runMantaCli(['node', 'manta', 'show', 'task-1']);
    expect(allLogOutput()).toContain('status:   todo');

    await runMantaCli(['node', 'manta', 'start', 'task-1']);
    expect(allLogOutput()).toContain('task-1: todo → in-progress');

    await runMantaCli(['node', 'manta', 'done', 'task-1']);
    expect(allLogOutput()).toContain('task-1: in-progress → done');

    await runMantaCli(['node', 'manta', 'search', 'oauth']);
    expect(allLogOutput()).toContain('Fix OAuth login');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('should treat repeated done as a no-op with exit 0', async () => {
    await runMantaCli(['node', 'manta', 'init']);
    await runMantaCli(['node', 'manta', 'add', 'a task']);
    await runMantaCli(['node', 'manta', 'done', 'task-1']);
    await runMantaCli(['node', 'manta', 'done', 'task-1']);

    expect(allLogOutput()).toContain('task-1 is already done (no-op).');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('should report TASK_NOT_FOUND as runtime failure with exit 1', async () => {
    await runMantaCli(['node', 'manta', 'init']);
    await runMantaCli(['node', 'manta', 'show', 'task-99']);

    expect(errorSpy).toHaveBeenCalledWith(
      '[RUNTIME_FAILURE] Runtime failure: Task not found: task-99',
    );
    expect(process.exitCode).toBe(1);
  });

  it('should report INVALID_TASK_ID as usage error with exit 2', async () => {
    await runMantaCli(['node', 'manta', 'init']);
    await runMantaCli(['node', 'manta', 'start', 'task-abc']);

    expect(errorSpy.mock.calls[0][0]).toContain(
      '[USAGE_ERROR] Usage error: Invalid task id: task-abc',
    );
    expect(process.exitCode).toBe(2);
  });

  it('should report NOT_INITIALIZED as runtime failure when outside a project', async () => {
    await runMantaCli(['node', 'manta', 'list']);

    expect(errorSpy.mock.calls[0][0]).toContain(
      '[RUNTIME_FAILURE] Runtime failure: Not a Manta project',
    );
    expect(process.exitCode).toBe(1);
  });

  it('should return empty search results with exit 0', async () => {
    await runMantaCli(['node', 'manta', 'init']);
    await runMantaCli(['node', 'manta', 'search', 'nomatch']);

    expect(allLogOutput()).toContain('No tasks matched "nomatch".');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });
});
