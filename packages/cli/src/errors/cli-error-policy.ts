import { CommanderError } from 'commander';
import type { MantaFailure } from '@manta/core';

// CLI exit code는 shell script와 AI agent가 가장 먼저 보는 실패 신호다.
// 0: 성공/no-op, 1: 실행 중 실패, 2: 사용자가 명령을 잘못 호출한 경우.
export const CLI_EXIT_CODES = {
  success: 0,
  runtimeFailure: 1,
  usageError: 2,
} as const;

// JSON error는 이번 task 범위 밖이지만, text stderr에도 안정 식별자를 둔다.
// 문구가 바뀌어도 AI와 로그 검색은 이 code로 분기할 수 있다.
export type CliErrorCode = 'UNKNOWN_COMMAND' | 'USAGE_ERROR' | 'RUNTIME_FAILURE';

export interface CliTextError {
  code: CliErrorCode;
  exitCode: number;
  message: string;
}

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1F\x7F]/g;
// 절단 한도는 로그 hygiene용이다. RUNTIME_FAILURE 메시지에는 파일 경로처럼
// 사용자가 그대로 복사해 써야 하는 값이 들어가므로 너무 짧으면 안 된다.
const MAX_RENDERED_VALUE_LENGTH = 300;

// 사용자 입력이 stderr에 그대로 들어가면 newline/ANSI escape로 로그를 속일 수 있다.
// 오류 메시지에 echo되는 값은 한 줄짜리 printable string으로 정규화한다.
export function sanitizeCliErrorValue(value: string): string {
  const singleLineValue = value
    .replace(ANSI_ESCAPE_PATTERN, '')
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (singleLineValue.length <= MAX_RENDERED_VALUE_LENGTH) {
    return singleLineValue;
  }

  return `${singleLineValue.slice(0, MAX_RENDERED_VALUE_LENGTH)}...`;
}

export function createUnknownCommandError(commandName: string): CliTextError {
  return {
    code: 'UNKNOWN_COMMAND',
    exitCode: CLI_EXIT_CODES.usageError,
    message: `Unknown command: ${sanitizeCliErrorValue(commandName)}. Run \`manta help\` to see available commands.`,
  };
}

export function createUsageError(message: string): CliTextError {
  return {
    code: 'USAGE_ERROR',
    exitCode: CLI_EXIT_CODES.usageError,
    message: `Usage error: ${sanitizeCliErrorValue(stripCommanderErrorPrefix(message))}`,
  };
}

export function createRuntimeFailureError(message: string): CliTextError {
  return {
    code: 'RUNTIME_FAILURE',
    exitCode: CLI_EXIT_CODES.runtimeFailure,
    message: `Runtime failure: ${sanitizeCliErrorValue(message)}`,
  };
}

export function formatCliError(cliTextError: CliTextError): string {
  return `[${cliTextError.code}] ${cliTextError.message}`;
}

// 모든 CLI 오류 출력은 이 함수로 모은다.
// 새 command가 추가돼도 stderr format과 exit code가 흩어지지 않게 하기 위함이다.
export function writeCliError(cliTextError: CliTextError): void {
  console.error(formatCliError(cliTextError));
  process.exitCode = cliTextError.exitCode;
}

// Commander parse 단계에서 발생하는 오류를 Manta의 세 분류로 수렴시킨다.
export function createCliErrorFromCommanderError(commanderError: CommanderError): CliTextError {
  if (commanderError.code === 'commander.unknownCommand') {
    return createUnknownCommandError(extractUnknownCommandName(commanderError.message));
  }

  return createUsageError(commanderError.message);
}

// Commander 밖에서 새어 나온 예외는 runtime failure로 본다.
// command action 내부에서 가능한 한 core Result를 명시적으로 변환하되, top-level guard도 둔다.
export function createCliErrorFromUnknownError(error: unknown): CliTextError {
  if (error instanceof Error) {
    return createRuntimeFailureError(error.message);
  }

  return createRuntimeFailureError(String(error));
}

// core Result 실패를 CLI 분류로 변환한다.
// INVALID_TASK_ID는 사용자가 인자를 잘못 준 것이므로 usage error(exit 2),
// 나머지(부재, 중복, 권한, 파손)는 실행 중 실패(exit 1)다.
export function createCliErrorFromCoreFailure(failure: MantaFailure): CliTextError {
  if (failure.error === 'INVALID_TASK_ID') {
    return createUsageError(failure.message);
  }
  return createRuntimeFailureError(failure.message);
}

function stripCommanderErrorPrefix(message: string): string {
  return message.replace(/^error:\s*/, '');
}

function extractUnknownCommandName(message: string): string {
  const match = stripCommanderErrorPrefix(message).match(/^unknown command '(.+)'$/);
  return match ? match[1] : stripCommanderErrorPrefix(message);
}
