#!/usr/bin/env node

import meow from "meow";
import { askCommand } from "./commands/ask.js";
import { configCommand, configResetCommand } from "./commands/config.js";
import { foldersCommand } from "./commands/folders.js";
import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";

// CLI flags for ask command
export interface AskFlags {
  folder?: string;
  limit?: number;
  sync?: boolean;
}

const cli = meow(
  `
  Usage
    $ vault <command> [options]

  Commands
    init              Interactive setup wizard
    ask <query>       Search your notes using semantic search
    sync              Manually sync folders with Nia
    folders           Manage folders in search scope
    config            View or reset configuration

  Options for 'ask'
    -f, --folder <id>  Search specific folder only
    -l, --limit <n>    Max results (default: 5)
    -s, --sync         Sync folders before searching

  Options for 'config'
    --reset           Delete configuration file

  Global Options
    -h, --help        Show help
    -v, --version     Show version number

  Examples
    $ vault init
    $ vault ask "What are my notes about project planning?"
    $ vault ask "meeting notes" --sync --limit 10
    $ vault sync
    $ vault folders
    $ vault config
    $ vault config --reset
`,
  {
    importMeta: import.meta,
    flags: {
      folder: {
        type: "string",
        shortFlag: "f",
      },
      limit: {
        type: "number",
        shortFlag: "l",
      },
      sync: {
        type: "boolean",
        shortFlag: "s",
      },
      reset: {
        type: "boolean",
      },
      help: {
        type: "boolean",
        shortFlag: "h",
      },
      version: {
        type: "boolean",
        shortFlag: "v",
      },
    },
  },
);

async function main(): Promise<void> {
  const [command, ...args] = cli.input;

  if (!command || cli.flags.help) {
    cli.showHelp();
    return;
  }

  switch (command) {
    case "init":
      await initCommand();
      break;

    case "ask": {
      const query = args.join(" ");
      const askFlags: AskFlags = {
        folder: cli.flags.folder,
        limit: cli.flags.limit,
        sync: cli.flags.sync,
      };
      await askCommand(query, askFlags);
      break;
    }

    case "sync":
      await syncCommand();
      break;

    case "folders":
      await foldersCommand();
      break;

    case "config":
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
  console.error("An unexpected error occurred:", error.message);
  process.exit(1);
});
