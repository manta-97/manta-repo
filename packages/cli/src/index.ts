#!/usr/bin/env node

import { Command } from 'commander';
import { VERSION } from '@manta/core';
import { createInitCommand } from './commands/init';

const program = new Command()
  .name('manta')
  .description('File-based task management for humans and AI')
  .version(VERSION);

program.addCommand(createInitCommand());

// argv를 파싱해서 매칭되는 커맨드의 action을 실행.
program.parse();
