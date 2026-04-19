import type { Command } from 'commander';
import { createInitCommand } from './init';
import { createHelpCommand } from './help';

export const commandFactories: Record<string, () => Command> = {
  init: createInitCommand,
  help: createHelpCommand,
};
