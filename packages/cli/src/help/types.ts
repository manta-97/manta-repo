import type { HelpJsonVersion } from '../types';

export interface CommandArg {
  name: string;
  required: boolean;
  description: string;
}

export interface CommandOption {
  flag: string;
  description: string;
}

export interface CommandExample {
  input: string;
}

export interface CommandHelpEntry {
  name: string;
  summary: string;
  usage: string;
  args: CommandArg[];
  options: CommandOption[];
  examples: CommandExample[];
}

export interface OverviewJson {
  kind: 'overview';
  version: HelpJsonVersion;
  commands: CommandHelpEntry[];
}

export interface CommandJson {
  kind: 'command';
  version: HelpJsonVersion;
  command: CommandHelpEntry;
}
