import { Command, CommanderError } from 'commander';
import { VERSION } from '@manta/core';
import { commandFactories } from './commands/command-factories';
import { commandHelpEntries } from './help/command-registry';
import { formatForCommanderHook, renderOverview } from './help/render-help';
import {
  createCliErrorFromCommanderError,
  createCliErrorFromUnknownError,
  writeCliError,
} from './errors/cli-error-policy';

export function createMantaProgram(): Command {
  const program = new Command()
    .name('manta')
    .description('File-based task management for humans and AI')
    .version(VERSION)
    // Commander가 process.exit()를 직접 호출하지 못하게 막는다.
    // 그래야 top-level에서 CommanderError를 Manta error policy로 변환할 수 있다.
    .exitOverride()
    .configureHelp({
      formatHelp: () => formatForCommanderHook(renderOverview(commandHelpEntries)),
    })
    .configureOutput({
      // Commander 기본 stderr는 Manta 형식이 아니므로 숨긴다.
      // 실제 출력은 catch block에서 writeCliError()로 한 번만 한다.
      writeErr: () => {},
      outputError: () => {},
    });

  for (const entry of commandHelpEntries) {
    const subcommand = commandFactories[entry.name]();
    // addCommand()는 부모의 exitOverride/configureOutput을 복사하지 않으므로
    // 서브커맨드에도 같은 종료/출력 정책을 직접 적용해야 한다.
    subcommand.exitOverride().configureOutput({
      writeErr: () => {},
      outputError: () => {},
    });
    program.addCommand(subcommand);
  }

  return program;
}

export async function runMantaCli(argv: readonly string[] = process.argv): Promise<void> {
  const program = createMantaProgram();

  try {
    // init 같은 command action은 async 파일 I/O를 한다.
    // parseAsync()를 써야 비동기 실패도 top-level policy가 기다리고 분류할 수 있다.
    await program.parseAsync([...argv]);
  } catch (error) {
    if (error instanceof CommanderError) {
      // --help, --version은 이미 stdout으로 출력이 끝난 정상 종료다.
      if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
        return;
      }
      // 인자 없는 `manta`: Commander는 help를 stderr로 보내는데 우리는 stderr를
      // 숨겼으므로, overview를 stdout에 직접 출력하고 성공으로 끝낸다.
      if (error.code === 'commander.help') {
        console.log(renderOverview(commandHelpEntries));
        return;
      }
      writeCliError(createCliErrorFromCommanderError(error));
      return;
    }

    writeCliError(createCliErrorFromUnknownError(error));
  }
}
