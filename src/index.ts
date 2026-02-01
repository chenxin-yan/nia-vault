#!/usr/bin/env node

import meow from 'meow';
import { initCommand } from './commands/init.js';
import { askCommand } from './commands/ask.js';
import { syncCommand } from './commands/sync.js';
import { foldersListCommand, foldersAddCommand, foldersRemoveCommand } from './commands/folders.js';
import { configCommand, configResetCommand } from './commands/config.js';
import type { AskFlags } from './types.js';

const cli = meow(
  `
  Usage
    $ vault <command> [options]

  Commands
    init              Interactive setup wizard
    ask <query>       Search your notes using semantic search
    sync              Manually sync folders with Nia
    folders           List, add, or remove folders from search scope
    config            View or reset configuration

  Options for 'ask'
    -f, --folder <id>  Search specific folder only
    -l, --limit <n>    Max results (default: 5)
    -s, --sync         Sync folders before searching

  Options for 'folders'
    list              List all folders (default)
    add               Add folders to search scope
    remove            Remove folders from search scope

  Options for 'config'
    --reset           Delete configuration file

  Examples
    $ vault init
    $ vault ask "What are my notes about project planning?"
    $ vault ask "meeting notes" --sync --limit 10
    $ vault sync
    $ vault folders
    $ vault folders add
    $ vault folders remove
    $ vault config
    $ vault config --reset
`,
  {
    importMeta: import.meta,
    flags: {
      folder: {
        type: 'string',
        shortFlag: 'f',
      },
      limit: {
        type: 'number',
        shortFlag: 'l',
      },
      sync: {
        type: 'boolean',
        shortFlag: 's',
      },
      reset: {
        type: 'boolean',
      },
      help: {
        type: 'boolean',
        shortFlag: 'h',
      },
      version: {
        type: 'boolean',
        shortFlag: 'v',
      },
    },
  }
);

async function main(): Promise<void> {
  const [command, ...args] = cli.input;

  if (!command || cli.flags.help) {
    cli.showHelp();
    return;
  }

  switch (command) {
    case 'init':
      await initCommand();
      break;

    case 'ask': {
      const query = args.join(' ');
      const askFlags: AskFlags = {
        folder: cli.flags.folder,
        limit: cli.flags.limit,
        sync: cli.flags.sync,
      };
      await askCommand(query, askFlags);
      break;
    }

    case 'sync':
      await syncCommand();
      break;

    case 'folders': {
      const subcommand = args[0] || 'list';
      switch (subcommand) {
        case 'list':
          await foldersListCommand();
          break;
        case 'add':
          await foldersAddCommand();
          break;
        case 'remove':
          await foldersRemoveCommand();
          break;
        default:
          console.log(`Unknown folders subcommand: ${subcommand}`);
          console.log("Available subcommands: list, add, remove\n");
          process.exit(1);
      }
      break;
    }

    case 'config':
      if (cli.flags.reset) {
        await configResetCommand();
      } else {
        await configCommand();
      }
      break;

    default:
      console.log(`Unknown command: ${command}\n`);
      cli.showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('An unexpected error occurred:', error.message);
  process.exit(1);
});
