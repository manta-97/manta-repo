#!/usr/bin/env node

import { Command } from 'commander';
import { VERSION } from '@manta/core';
import { commandFactories } from './commands/command-factories';
import { commandHelpEntries } from './help/command-registry';
import { formatForCommanderHook, renderOverview } from './help/render-help';

const program = new Command()
  .name('manta')
  .description('File-based task management for humans and AI')
  .version(VERSION)
  .configureHelp({
    formatHelp: () => formatForCommanderHook(renderOverview(commandHelpEntries)),
  });

for (const entry of commandHelpEntries) {
  program.addCommand(commandFactories[entry.name]());
}

program.parse();
