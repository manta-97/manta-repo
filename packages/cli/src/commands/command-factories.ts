import type { Command } from 'commander';
import { createInitCommand } from './init';
import { createAddCommand } from './add';
import { createListCommand } from './list';
import { createShowCommand } from './show';
import { createStartCommand, createDoneCommand } from './move-task-command';
import { createEditCommand } from './edit';
import { createSearchCommand } from './search';
import { createIndexCommand } from './index-command';
import { createHelpCommand } from './help';

export const commandFactories: Record<string, () => Command> = {
  init: createInitCommand,
  add: createAddCommand,
  list: createListCommand,
  show: createShowCommand,
  start: createStartCommand,
  done: createDoneCommand,
  edit: createEditCommand,
  search: createSearchCommand,
  index: createIndexCommand,
  help: createHelpCommand,
};
